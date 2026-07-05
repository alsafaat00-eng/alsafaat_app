# Stories Feature — Implementation Report

## Summary

Production Stories experience for SAFAT: NestJS backend + React Native Expo frontend. Users publish image/video stories (24h expiry) with optional caption, location, and listing link. Feed is grouped by user (unseen first), with full-screen viewer, views, reactions, private replies via chat, and owner-only viewer list.

## Files added

### Backend (`backend-nest`)

| File | Role |
|------|------|
| `src/stories/repositories/story-view.repository.ts` | Unique views, viewer list |
| `src/stories/repositories/story-reaction.repository.ts` | Upsert / remove reactions |
| `STORIES_FEATURE_REPORT.md` | This report |

### Frontend (`frontend`)

| File | Role |
|------|------|
| `services/stories.ts` | API client for feed, views, reactions, replies |

## Files modified

### Backend

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `Story.location`, `reactionsCount`, listing relation, indexes; `StoryView` viewer relation + indexes; `StoryReaction` model; `NotificationType.story_reaction` / `story_reply` |
| `src/stories/dto/stories.dto.ts` | Create/reaction/reply DTOs + Swagger |
| `src/stories/repositories/stories.repository.ts` | Feed queries, listing check, counters |
| `src/stories/stories.service.ts` | Feed, views, reactions, replies, cache |
| `src/stories/stories.controller.ts` | Full REST surface + Swagger tags |
| `src/stories/stories.module.ts` | Wire view/reaction repos + MessagesModule |
| `src/messages/messages.module.ts` | Export `MessagesService` |
| `src/messages/dto/messages.dto.ts` | Allow programmatic send from stories |
| `src/shared/lib/stories.ts` | Max duration 30s |

### Frontend

| File | Change |
|------|--------|
| `components/feature/StoriesBar.tsx` | Grouped bar + full-screen viewer (progress, gestures, reactions, reply, listing CTA, viewers) |
| `app/(tabs)/index.tsx` | Feed API integration |
| `app/create/story.tsx` | Optional location field |
| `constants/stories.ts` | Max duration 30s |
| `services/types.ts` | Extended `Story` fields |
| `components/feature/StoryVideoPlayer.tsx` | `autoPlay` / `nativeControls` (prior work, reused) |

## Database changes

```prisma
Story {
  location        String?
  reactionsCount  Int @default(0)
  listing         Listing? @relation(...)
  reactions       StoryReaction[]
  @@index([userId, expiresAt, createdAt])
  @@index([expiresAt, createdAt])
  @@index([listingId])
}

StoryView {
  viewer User @relation(...)
  @@index([storyId, createdAt])
  @@index([viewerId])
}

StoryReaction {
  id, storyId, userId, type, createdAt, updatedAt
  @@unique([storyId, userId])
  @@index([storyId])
  @@index([userId])
}

NotificationType += story_reaction, story_reply
```

Applied via `npx prisma db push`.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/stories/feed` | Optional | Grouped feed (`items` + `myStories`) |
| `GET` | `/api/stories` | Optional | Flat active stories (legacy-compatible) |
| `GET` | `/api/stories/me` | Required | Current user stories |
| `GET` | `/api/stories/user/:userId` | Optional | User stories |
| `POST` | `/api/stories` | Required | Create story |
| `DELETE` | `/api/stories/:id` | Required | Delete own story |
| `POST` | `/api/stories/:id/view` | Required | Record unique view |
| `GET` | `/api/stories/:id/viewers` | Required | Owner-only viewers |
| `POST` | `/api/stories/:id/reactions` | Required | Add/change reaction |
| `DELETE` | `/api/stories/:id/reactions` | Required | Remove reaction |
| `POST` | `/api/stories/:id/reply` | Required | Private chat reply |

Butcher stories (`/api/butchers/stories`) unchanged.

## Frontend screens / UX

- **Home stories bar**: “قصتي” first (thumbnail or `+`), then users with active stories; unseen ring vs seen ring; skeleton loading.
- **Full-screen viewer**: progress bars, auto-advance, tap L/R, long-press pause, swipe-down close, auto-advance to next user, mute for video, preload next media.
- **Reactions**: like / love / fire / wow / sad (one per user, changeable).
- **Reply**: private message → navigates to existing chat thread.
- **Listing CTA**: “عرض الإعلان” → `/listing/[id]`.
- **Owner**: views count, viewers sheet, delete.
- **Create story**: image/video upload, caption, optional location; 24h expiry.

## Performance optimizations

- Redis feed cache (`stories:feed:{userId}` / anon), TTL 20s; invalidated on create/delete/view/reaction.
- Feed query filters `expiresAt > now` with composite indexes.
- Unique `(storyId, viewerId)` prevents duplicate views.
- Frontend: `Image.prefetch` for next story/group; video autoplay only when not paused; FlatList for viewers; horizontal ScrollView for bar; no blocking UI on network.

## Permissions

- Create / react / reply / view-record: authenticated.
- Delete / viewers: owner (or admin).
- Expired stories excluded from all feed queries.

## Verification

- `npm run build` — pass
- `npm run lint` — pass (after `--fix`)
- `npm test` — pass

## Remaining TODOs (optional enhancements)

- Owner picker for linking a listing at create time (API already accepts `listingId`).
- Reaction breakdown counts per type in UI.
- Background job to purge expired story media from storage.
- E2E tests for feed ordering and unique views.
- Stronger feed cache invalidation for all viewers (currently pattern delete when Redis enabled).
