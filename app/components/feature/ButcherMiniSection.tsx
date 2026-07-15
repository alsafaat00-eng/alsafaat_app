// Powered by OnSpace.AI
// SAFAT — ButcherMiniSection — Hungerstation-style horizontal cards
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { Image, uriSource } from '@/components/ui/AppImage';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  imageCardOverlayStrong,
  radius,
  spacing,
  typography,
  type ThemeColors,
} from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { rtlForwardIcon } from '@/lib/rtl';
import { ButcherStory, gccCurrencies } from '@/services/butcherData';
import { countries } from '@/services/types';
import { useButcher } from '@/hooks/useButcher';

const STORY_RING_COLORS = {
  daily_slaughter: ['#EF4444', '#DC2626'],
  offer:           ['#F59E0B', '#D97706'],
  new_stock:       ['#10B981', '#059669'],
  update:          ['#3B82F6', '#2563EB'],
} as const;

// Card dimensions
const CARD_W      = 220;
const COVER_H     = 148;
const STORY_SIZE  = 52;

interface ButcherMiniSectionProps {
  limit?:       number;
  showStories?: boolean;
}

export function ButcherMiniSection({
  limit = 6,
  showStories = true,
}: ButcherMiniSectionProps) {
  const router      = useRouter();
  const { scheme }  = useTheme();
  const s           = useThemedStyles(({ colors }) => createStyles(colors));
  const cardOverlay = imageCardOverlayStrong(scheme);

  const { filteredButchers, stories, loading } = useButcher();
  const ranked = filteredButchers.slice(0, limit);

  return (
    <View style={s.wrapper}>

      {/* ── Section header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>الملاحم</Text>
          <Text style={s.subtitle}>لحوم طازجة قريبة منك</Text>
        </View>
        <Pressable style={s.seeAllBtn} onPress={() => router.push('/butchers')}>
          <Text style={s.seeAllText}>عرض الكل</Text>
          <AppIcon name={rtlForwardIcon} size={13} color={colors.electricBright} />
        </Pressable>
      </View>

      {/* ── Stories strip ──────────────────────────────────────────── */}
      {showStories && stories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.storiesRow}
        >
          {stories.slice(0, 6).map((story) => {
            const ringColors =
              STORY_RING_COLORS[story.type as keyof typeof STORY_RING_COLORS] ??
              STORY_RING_COLORS.update;
            const label = (story.butcherNameAr || story.butcherName || 'ملحمة').split(' ')[0];
            return (
              <Pressable
                key={story.id}
                style={s.storyItem}
                onPress={() =>
                  router.push({
                    pathname: '/butchers/story-viewer',
                    params: { butcherId: story.butcherId, storyId: story.id },
                  })
                }
              >
                <LinearGradient
                  colors={story.seen ? [colors.borderSoft, colors.borderSoft] : ringColors}
                  style={s.storyRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image
                    source={uriSource(story.butcherLogo || story.thumbnail)}
                    style={s.storyAvatar}
                    contentFit="cover"
                  />
                </LinearGradient>
                {story.isVerified && (
                  <View style={s.verifiedDot}>
                    <AppIcon name="shield-checkmark" size={8} color={colors.gold} />
                  </View>
                )}
                <Text style={s.storyName} numberOfLines={1}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Butcher cards ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.cardsRow}
        decelerationRate="fast"
        snapToInterval={CARD_W + spacing.md}
        snapToAlignment="start"
      >
        {loading && ranked.length === 0 ? (
          <View style={s.skeleton}>
            <Text style={s.skeletonText}>جاري التحميل...</Text>
          </View>
        ) : ranked.length === 0 ? (
          <Pressable style={s.skeleton} onPress={() => router.push('/butchers')}>
            <AppIcon name="storefront-outline" size={26} color={colors.electricBright} />
            <Text style={s.skeletonText}>لا توجد ملاحم حالياً</Text>
          </Pressable>
        ) : (
          ranked.map((butcher) => {
            const currency   = gccCurrencies[butcher.country];
            const country    = countries[butcher.country];
            const isFeatured = butcher.subscriptionActive;
            const isTopRated = butcher.rating >= 4.5;
            const isNew      = (butcher.totalOrders ?? 0) < 20;

            return (
              <Pressable
                key={butcher.id}
                style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
                onPress={() =>
                  router.push({ pathname: '/butchers/[id]', params: { id: butcher.id } })
                }
              >
                {/* ── Cover image area ──────────────────────────── */}
                <View style={s.coverWrap}>
                  <Image
                    source={uriSource(butcher.cover || butcher.logo)}
                    style={s.cover}
                    contentFit="cover"
                  />

                  {/* Bottom gradient overlay */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={[StyleSheet.absoluteFill, { top: '40%' }]}
                  />

                  {/* Top row: heart  |  rating + New */}
                  <View style={s.topRow}>
                    {/* Heart (left in RTL = visual right) */}
                    <View style={s.heartBtn}>
                      <AppIcon name="heart-outline" size={15} color="#fff" />
                    </View>

                    {/* Rating chip + New badge */}
                    <View style={s.topRight}>
                      {isNew && (
                        <View style={s.newBadge}>
                          <Text style={s.newBadgeText}>جديد</Text>
                        </View>
                      )}
                      <View style={s.ratingChip}>
                        <AppIcon name="star" size={11} color={colors.gold} />
                        <Text style={s.ratingText}>{butcher.rating.toFixed(1)}</Text>
                        <Text style={s.ratingCount}>
                          ({butcher.totalOrders > 999
                            ? (butcher.totalOrders / 1000).toFixed(1) + 'k'
                            : butcher.totalOrders})
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Open/closed pill */}
                  <View
                    style={[
                      s.statusPill,
                      {
                        backgroundColor: butcher.workingHours.isOpen
                          ? 'rgba(16,185,129,0.85)'
                          : 'rgba(239,68,68,0.85)',
                      },
                    ]}
                  >
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>
                      {butcher.workingHours.isOpen ? 'مفتوح' : 'مغلق'}
                    </Text>
                  </View>

                  {/* Bottom badges row: "الأكثر تفضيلاً" | "مميز" */}
                  {(isTopRated || isFeatured) && (
                    <View style={s.badgesRow}>
                      {isTopRated && (
                        <View style={s.badgePreferred}>
                          <AppIcon name="checkmark-circle" size={10} color="#fff" />
                          <Text style={s.badgeText}>الأعلى تقييماً</Text>
                        </View>
                      )}
                      {isFeatured && (
                        <View style={s.badgeFeatured}>
                          <AppIcon name="star" size={10} color="#1A1300" />
                          <Text style={[s.badgeText, { color: '#1A1300' }]}>مميز</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* ── Info area ─────────────────────────────────── */}
                <View style={s.info}>
                  {/* Name */}
                  <Text style={s.name} numberOfLines={1}>{butcher.nameAr}</Text>

                  {/* Location / tag line */}
                  <Text style={s.tagLine} numberOfLines={1}>
                    {country?.flag} {butcher.cityAr}
                    {currency ? `  ·  ${currency.symbol}` : ''}
                  </Text>

                  {/* Meta: orders · delivery time */}
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <AppIcon name="clock-outline" size={11} color={colors.textMuted} />
                      <Text style={s.metaText}>
                        {butcher.workingHours.isOpen ? '20-35 دق' : 'مغلق حالياً'}
                      </Text>
                    </View>
                    <View style={s.metaDot} />
                    <View style={s.metaItem}>
                      <AppIcon name="people-outline" size={11} color={colors.textMuted} />
                      <Text style={s.metaText}>
                        {butcher.totalOrders.toLocaleString()} طلب
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: { marginVertical: spacing.lg },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    headerLeft: { gap: 2 },
    title:      { ...typography.h3, color: colors.textPrimary, fontWeight: '800' },
    subtitle:   { ...typography.micro, color: colors.textBrand },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.electric + '14',
      borderWidth: 1,
      borderColor: colors.electricBright + '40',
    },
    seeAllText: { ...typography.micro, color: colors.textBrandStrong, fontWeight: '700' },

    // Stories
    storiesRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    storyItem: {
      alignItems: 'center',
      gap: 4,
      position: 'relative',
      width: STORY_SIZE + 4,
    },
    storyRing: {
      width: STORY_SIZE + 4,
      height: STORY_SIZE + 4,
      borderRadius: (STORY_SIZE + 4) / 2,
      padding: 2.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storyAvatar: {
      width: STORY_SIZE,
      height: STORY_SIZE,
      borderRadius: STORY_SIZE / 2,
      borderWidth: 2,
      borderColor: colors.bgDeep,
      backgroundColor: colors.bgSurface,
    },
    verifiedDot: {
      position: 'absolute',
      bottom: 16,
      right: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.bgDeep,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.gold + '55',
    },
    storyName: {
      ...typography.micro,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: STORY_SIZE + 4,
      fontSize: 10,
    },

    // Cards scroll
    cardsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      paddingBottom: 4,
    },

    // Card
    card: {
      width: CARD_W,
      backgroundColor: colors.bgSurface,
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      // shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },

    // Cover
    coverWrap: {
      height: COVER_H,
      position: 'relative',
    },
    cover: {
      width: '100%',
      height: '100%',
    },

    // Top row overlays
    topRow: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heartBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    topRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    newBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.success,
    },
    newBadgeText: {
      ...typography.micro,
      color: '#fff',
      fontWeight: '800',
      fontSize: 9,
    },
    ratingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    ratingText: {
      ...typography.micro,
      color: '#fff',
      fontWeight: '800',
      fontSize: 11,
    },
    ratingCount: {
      ...typography.micro,
      color: 'rgba(255,255,255,0.75)',
      fontSize: 9,
    },

    // Open/closed pill (bottom-left of cover)
    statusPill: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
    },
    statusText: {
      ...typography.micro,
      color: '#fff',
      fontWeight: '700',
      fontSize: 10,
    },

    // Bottom badges (top-rated, featured) on cover
    badgesRow: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      flexDirection: 'row',
      gap: 4,
    },
    badgePreferred: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(59,130,246,0.88)',
    },
    badgeFeatured: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.gold,
    },
    badgeText: {
      ...typography.micro,
      color: '#fff',
      fontWeight: '700',
      fontSize: 9,
    },

    // Info section
    info: {
      padding: spacing.sm,
      paddingHorizontal: 12,
      gap: 4,
    },
    name: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '800',
      fontSize: 14,
    },
    tagLine: {
      ...typography.micro,
      color: colors.textSecondary,
      fontSize: 11,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
      paddingTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderHairline,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      ...typography.micro,
      color: colors.textMuted,
      fontSize: 10,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.borderSoft,
    },

    // Skeleton / empty
    skeleton: {
      width: CARD_W,
      height: COVER_H + 80,
      backgroundColor: colors.bgSurface,
      borderRadius: radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    skeletonText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  });
}
