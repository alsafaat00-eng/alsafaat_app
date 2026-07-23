// Powered by OnSpace.AI
// SAFAT — Profile Tab (حسابي)
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/contexts/AuthContext';
import { ListingCard } from '@/components/feature/ListingCard';
import { PostItem } from '@/components/feature/PostItem';
import { ProfileScreenLayout, type ProfileDisplayUser } from '@/components/feature/ProfileScreenLayout';
import { requireAuth, sharePost, showPostMenu } from '@/lib/postInteractions';
import { openPostDetail } from '@/lib/openPost';
import { fetchStoriesFeed, type StoryGroup } from '@/services/stories';

export default function ProfileScreen() {
  const router = useRouter();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  const {
    me,
    listings,
    posts,
    likedPosts,
    bookmarkedPosts,
    toggleLike,
    toggleBookmark,
    deletePost,
    refetchData,
  } = useApp();
  const { accessToken, isAuthenticated } = useAuth();

  const [hasStories, setHasStories] = useState(false);
  const [myStoryGroup, setMyStoryGroup] = useState<StoryGroup | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const profileUrl = `https://alsfat.com/u/${me.username}`;

  const loadStories = useCallback(async () => {
    try {
      const data = await fetchStoriesFeed(accessToken);
      const mine = data.myStories ?? null;
      setMyStoryGroup(mine);
      const now = Date.now();
      setHasStories(
        mine != null &&
          (mine.stories?.length ?? 0) > 0 &&
          mine.stories.some((s) => new Date(s.expiresAt).getTime() > now),
      );
    } catch {
      /* silent */
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadStories();
      void refetchData();
    }, [loadStories, refetchData]),
  );

  const myListings = useMemo(
    () => listings.filter((l) => l.seller.id === me.id),
    [listings, me.id],
  );
  const myPosts = useMemo(
    () =>
      posts
        .filter((p) => p.author.id === me.id)
        .slice()
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [posts, me.id],
  );

  const profileUser: ProfileDisplayUser = useMemo(
    () => ({
      id: me.id,
      username: me.username,
      displayName: me.displayName,
      arabicName: me.arabicName,
      avatar: me.avatar,
      verified: me.verified,
      bio: me.bio,
      country: me.country,
      followersCount: me.followers,
      followingCount: me.following,
      postsCount: me.postsCount ?? myPosts.length,
    }),
    [me, myPosts.length],
  );

  const openConnections = (t: 'followers' | 'following') => {
    router.push({
      pathname: '/profile/connections',
      params: { userId: me.id, tab: t, username: me.username },
    } as never);
  };

  const handleShare = () => {
    Share.share({
      message: `تفقّد بروفايل ${me.arabicName || me.displayName} في تطبيق سرح 🐪\n${profileUrl}`,
      title: 'سرح — المنصة الوطنية للثروة الحيوانية',
      url: profileUrl,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStories(), refetchData()]);
    setRefreshing(false);
  }, [loadStories, refetchData]);

  const renderPosts = () => {
    if (myPosts.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>لا توجد منشورات بعد</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/create/post')}>
            <Text style={styles.emptyBtnText}>+ أنشئ منشوراً</Text>
          </Pressable>
        </View>
      );
    }

    return myPosts.map((post) => (
      <PostItem
        key={post.id}
        post={{
          ...post,
          liked: likedPosts.has(post.id),
          bookmarked: bookmarkedPosts.has(post.id),
        }}
        onPress={() => openPostDetail(router, post.id)}
        onLike={() => requireAuth(isAuthenticated, 'الإعجاب') && toggleLike(post.id)}
        onComment={() => openPostDetail(router, post.id, { focusComment: isAuthenticated })}
        onBookmark={() => requireAuth(isAuthenticated, 'الحفظ') && toggleBookmark(post.id)}
        onShare={() => sharePost(post)}
        onMenu={() => showPostMenu(post, me, router, deletePost, isAuthenticated)}
      />
    ));
  };

  const renderAds = () => {
    if (myListings.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>لا توجد إعلانات بعد</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/create/listing')}>
            <Text style={styles.emptyBtnText}>+ أضف إعلاناً</Text>
          </Pressable>
        </View>
      );
    }

    return myListings.map((listing) => (
      <ListingCard
        key={listing.id}
        listing={listing}
        variant="list"
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      />
    ));
  };

  return (
    <ProfileScreenLayout
      mode="own"
      user={profileUser}
      hasStoryRing={hasStories}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onMenu={() => router.push('/sidebar')}
      onEditProfile={() => router.push('/profile/edit')}
      onEditAvatar={() => router.push('/profile/edit')}
      onAvatarPress={() => {
        if (hasStories && myStoryGroup) {
          router.push({
            pathname: '/stories/view',
            params: { groupIndex: '0' },
          } as never);
        }
      }}
      onFollowersPress={() => openConnections('followers')}
      onFollowingPress={() => openConnections('following')}
      postsContent={renderPosts()}
      adsContent={renderAds()}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    emptyTitle: {
      ...typography.body,
      color: colors.textMuted,
    },
    emptyBtn: {
      marginTop: 4,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.royal,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.electric,
    },
    emptyBtnText: {
      ...typography.bodyStrong,
      color: colors.textBrandStrong,
    },
  });
}
