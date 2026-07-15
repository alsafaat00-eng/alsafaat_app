// Powered by OnSpace.AI
// SAFAT — Profile Tab (حسابي) — compact, animated, modern
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { Image, uriSource } from '@/components/ui/AppImage';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryInfo } from '@/services/types';
import { ListingCard } from '@/components/feature/ListingCard';
import { PostItem } from '@/components/feature/PostItem';
import { PostCommentsModal } from '@/components/feature/PostCommentsModal';
import { requireAuth, sharePost, showPostMenu } from '@/lib/postInteractions';
import { fetchStoriesFeed, type StoryGroup } from '@/services/stories';

// ─── Constants ───────────────────────────────────────────────────────────────
const COVER_HEIGHT = 140;
const AVATAR_SIZE  = 86;
type ProfileTab = 'posts' | 'listings' | 'about';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'posts',    label: 'المنشورات' },
  { id: 'listings', label: 'الإعلانات' },
  { id: 'about',    label: 'التقييم' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const { gradients } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  const {
    me, listings, posts,
    likedPosts, repostedPosts,
    toggleLike, toggleRepost, deletePost, addComment,
    updateMe,
  } = useApp();
  const { accessToken, isAuthenticated } = useAuth();

  const [activeTab,      setActiveTab]      = useState<ProfileTab>('posts');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [hasStories,     setHasStories]     = useState(false);
  const [myStoryGroup,   setMyStoryGroup]   = useState<StoryGroup | null>(null);
  const [refreshing,     setRefreshing]     = useState(false);

  // ── Animated values ──────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  // Cover fades as you scroll past it
  const coverOpacity = scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const switchTab = useCallback((newTab: ProfileTab) => {
    setActiveTab(newTab);
  }, []);

  // Deep-link to a tab
  useEffect(() => {
    if (tab === 'listings') switchTab('listings');
    else if (tab === 'about') switchTab('about');
    else if (tab === 'posts') switchTab('posts');
  }, [tab, switchTab]);

  // Fetch stories
  const loadStories = useCallback(async () => {
    try {
      const data = await fetchStoriesFeed(accessToken);
      const mine = data.myStories ?? null;
      setMyStoryGroup(mine);
      setHasStories(
        mine != null &&
        (mine.stories?.length ?? 0) > 0 &&
        mine.stories.some((s: any) => !s.expired),
      );
    } catch { /* silent */ }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { void loadStories(); }, [loadStories]));

  // ─── Data ─────────────────────────────────────────────────────────────────
  const myListings = listings.filter((l) => l.seller.id === me.id);
  const myPosts    = posts.filter((p) => p.author.id === me.id);

  const country      = getCountryInfo(me.country);
  const hasRating    = me.rating != null && (me.reviewCount ?? 0) > 0;
  const ratingLabel  = hasRating ? me.rating!.toFixed(1) : '—';
  const ratingDetail = hasRating
    ? `${me.rating!.toFixed(1)} / 5.0 ⭐  (${me.reviewCount} تقييم)`
    : 'لا توجد تقييمات بعد';

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openConnections = (t: 'followers' | 'following') => {
    router.push({
      pathname: '/profile/connections',
      params: { userId: me.id, tab: t, username: me.username },
    } as never);
  };

  const handlePickCover = async () => {
    if (!accessToken) {
      Alert.alert('تسجيل الدخول', 'يجب تسجيل الدخول لتغيير صورة الغلاف');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول إلى مكتبة الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingCover(true);
    try {
      const res = await updateMe({ coverImage: result.assets[0].uri });
      if (!res.ok) Alert.alert('خطأ', res.error || 'فشل حفظ الغلاف');
    } catch { Alert.alert('خطأ', 'فشل رفع الغلاف'); }
    finally    { setUploadingCover(false); }
  };

  const handleShare = () => {
    Share.share({
      message: `تفقّد بروفايل ${me.arabicName || me.displayName} في تطبيق سرح 🐪\nhttps://alsfat.com/u/${me.username}`,
      title: 'سرح — المنصة الوطنية للثروة الحيوانية',
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStories();
    setRefreshing(false);
  }, [loadStories]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.electricBright}
          />
        }
      >
        {/* ── [0] Profile header ────────────────────────────────────────── */}
        <View>

          {/* Cover — tappable to change photo */}
          <Pressable onPress={handlePickCover} disabled={uploadingCover} style={styles.coverWrap}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: coverOpacity }]}>
              {me.coverImage ? (
                <Image source={{ uri: me.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <LinearGradient
                  colors={gradients.royal}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <View style={styles.cameraBadge} pointerEvents="none">
              {uploadingCover
                ? <ActivityIndicator size="small" color="#fff" />
                : <AppIcon name="camera-outline" size={14} color="#fff" />}
            </View>
          </Pressable>

          {/* ── Avatar + action buttons row ─────────────────────────── */}
          <View style={styles.avatarRow}>
            {/* Avatar with story ring */}
            <Pressable
              onPress={() => {
                if (hasStories && myStoryGroup) {
                  router.push({ pathname: '/stories/view', params: { groupIndex: '0' } } as never);
                }
              }}
              style={styles.avatarWrap}
            >
              <LinearGradient
                colors={
                  hasStories
                    ? [colors.electricBright, colors.cyan, '#34D399']
                    : [colors.borderSoft, colors.borderSoft]
                }
                style={styles.avatarRingGradient}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.avatarInnerWrap}>
                  <Image source={uriSource(me.avatar)} style={styles.avatar} contentFit="cover" />
                </View>
              </LinearGradient>
              {me.verified && (
                <View style={styles.verifiedBadge}>
                  <AppIcon name="checkmark-circle" size={17} color={colors.electricBright} />
                </View>
              )}
            </Pressable>

            {/* Action buttons — right side */}
            <View style={styles.actionRow}>
              <Pressable style={styles.btnEdit} onPress={() => router.push('/profile/edit')}>
                <AppIcon name="edit-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.btnEditText}>تعديل</Text>
              </Pressable>
              <Pressable style={styles.btnIcon} onPress={handleShare}>
                <AppIcon name="share-social-outline" size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                style={styles.btnIcon}
                onPress={() =>
                  Alert.alert('المزيد', '', [
                    { text: 'نسخ الرابط',  onPress: handleShare },
                    { text: 'الإعدادات',   onPress: () => router.push('/settings/account') },
                    { text: 'إلغاء', style: 'cancel' },
                  ])
                }
              >
                <AppIcon name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ── Name · handle · bio · location ─────────────────────── */}
          <View style={styles.infoWrap}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {me.arabicName || me.displayName}
              </Text>
              {me.verified && (
                <AppIcon name="checkmark-circle" size={16} color={colors.electricBright} />
              )}
            </View>

            <Text style={styles.handle}>@{me.username}</Text>

            {!!me.bio && (
              <Text style={styles.bio} numberOfLines={2}>{me.bio}</Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <AppIcon name="map-marker-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{country.flag} {country.ar}</Text>
              </View>
              {hasRating && (
                <View style={styles.metaChip}>
                  <AppIcon name="star" size={12} color={colors.gold} />
                  <Text style={[styles.metaText, { color: colors.gold }]}>{ratingLabel}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Stats row ───────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{myPosts.length}</Text>
              <Text style={styles.statLbl}>منشورات</Text>
            </View>
            <View style={styles.statDivider} />
            <Pressable style={styles.statItem} onPress={() => openConnections('followers')}>
              <Text style={styles.statNum}>{me.followers.toLocaleString('ar-SA')}</Text>
              <Text style={styles.statLbl}>متابعون</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable style={styles.statItem} onPress={() => openConnections('following')}>
              <Text style={styles.statNum}>{me.following.toLocaleString('ar-SA')}</Text>
              <Text style={styles.statLbl}>متابَعون</Text>
            </Pressable>
          </View>
        </View>

        {/* ── [1] تبويبات أفقية: المنشورات | الإعلانات | التقييم ── */}
        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <Pressable
                key={t.id}
                style={styles.tabItem}
                onPress={() => switchTab(t.id)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {t.label}
                </Text>
                {active ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>

        {/* ── [2] محتوى التبويب النشط فقط (لا تظهر الثلاثة فوق بعض) ── */}
        {activeTab === 'posts' && (
          myPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>لا منشورات بعد</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/create/post')}>
                <Text style={styles.emptyBtnText}>+ أنشئ منشوراً</Text>
              </Pressable>
            </View>
          ) : (
            myPosts.map((post) => (
              <PostItem
                key={post.id}
                post={{
                  ...post,
                  liked:    likedPosts.has(post.id),
                  reposted: repostedPosts.has(post.id),
                }}
                onLike={()    => requireAuth(isAuthenticated, 'الإعجاب')     && toggleLike(post.id)}
                onComment={()  => requireAuth(isAuthenticated, 'التعليق')     && setCommentsPostId(post.id)}
                onRepost={()   => requireAuth(isAuthenticated, 'إعادة النشر') && toggleRepost(post.id)}
                onShare={()    => sharePost(post)}
                onMenu={()     => showPostMenu(post, me, router, deletePost, isAuthenticated)}
              />
            ))
          )
        )}

        {activeTab === 'listings' && (
          myListings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>لا إعلانات بعد</Text>
              <Text style={styles.emptyHint}>اضغط + لإضافة إعلانك الأول</Text>
            </View>
          ) : (
            <View>
              {myListings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  variant="list"
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}
                />
              ))}
              <View style={{ height: 80 }} />
            </View>
          )
        )}

        {activeTab === 'about' && (
          <View style={styles.aboutWrap}>
            {[
              { icon: 'star-outline',           label: 'التقييم',   value: ratingDetail },
              { icon: 'earth',                  label: 'الدولة',    value: `${country.flag} ${country.ar}` },
              {
                icon: 'shield-checkmark-outline',
                label: 'الحالة',
                value: me.verified ? '✅ موثّق' : '🔓 غير موثّق',
              },
              { icon: 'people-outline',     label: 'المتابعون', value: me.followers.toLocaleString('ar-SA') },
              { icon: 'person-add-outline', label: 'يتابع',     value: me.following.toLocaleString('ar-SA') },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[styles.aboutRow, i < arr.length - 1 && styles.aboutRowBorder]}
              >
                <AppIcon name={item.icon as string} size={16} color={colors.glow} />
                <Text style={styles.aboutLabel}>{item.label}</Text>
                <Text style={styles.aboutValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 + insets.bottom }} />
      </Animated.ScrollView>

      {/* ── FAB — new listing (only visible on listings tab) ──────────── */}
      {activeTab === 'listings' && (
        <Pressable
          style={[styles.fab, { bottom: 24 + insets.bottom }]}
          onPress={() => router.push('/create/listing')}
        >
          <LinearGradient
            colors={gradients.royal}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <AppIcon name="add" size={26} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}

      {/* Comments modal */}
      <PostCommentsModal
        visible={!!commentsPostId}
        postId={commentsPostId}
        onClose={() => setCommentsPostId(null)}
        onSubmitComment={(content) =>
          commentsPostId ? addComment(commentsPostId, content) : Promise.resolve(false)
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgDeep },

    // ── Cover ──────────────────────────────────────────────────────────────
    coverWrap: {
      height: COVER_HEIGHT,
      overflow: 'hidden',
      backgroundColor: colors.bgElevated,
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 8,
      right: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },

    // ── Avatar row ─────────────────────────────────────────────────────────
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginTop: -(AVATAR_SIZE / 2 + 2),
      paddingBottom: 4,
      zIndex: 2,
    },
    avatarWrap: { position: 'relative' },
    avatarRingGradient: {
      width: AVATAR_SIZE + 4,
      height: AVATAR_SIZE + 4,
      borderRadius: (AVATAR_SIZE + 4) / 2,
      padding: 2,
    },
    avatarInnerWrap: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: colors.bgElevated,
      borderWidth: 3,
      borderColor: colors.bgDeep,
    },
    avatar: { width: '100%', height: '100%' },
    verifiedBadge: {
      position: 'absolute',
      bottom: 1,
      right: 1,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.bgDeep,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Action buttons (compact + modern) ──────────────────────────────────
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 4,
    },
    btnEdit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderMid,
      backgroundColor: colors.bgSurface,
    },
    btnEditText: {
      ...typography.micro,
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 12,
    },
    btnIcon: {
      width: 33,
      height: 33,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.borderMid,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Info (tight, no gap) ───────────────────────────────────────────────
    infoWrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: 2,
      paddingBottom: 8,
      gap: 2,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    displayName: {
      ...typography.h2,
      fontSize: 19,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    handle: {
      ...typography.micro,
      color: colors.textMuted,
      fontSize: 12,
    },
    bio: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.bgSurface,
    },
    metaText: {
      ...typography.micro,
      color: colors.textMuted,
      fontSize: 11,
    },

    // ── Stats row (compact) ────────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      marginHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderHairline,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 1,
    },
    statNum: {
      ...typography.h3,
      color: colors.textPrimary,
      fontWeight: '800',
      fontSize: 18,
    },
    statLbl: {
      ...typography.micro,
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 10,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 28,
      backgroundColor: colors.borderHairline,
    },

    // ── Tab bar — صف أفقي واحد ─────────────────────────────────────────────
    tabBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.bgDeep,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSoft,
      width: '100%',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      position: 'relative',
    },
    tabLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 13,
      textAlign: 'center',
    },
    tabLabelActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },
    tabUnderline: {
      position: 'absolute',
      bottom: 0,
      left: '20%',
      right: '20%',
      height: 2.5,
      borderRadius: 2,
      backgroundColor: colors.electricBright,
    },

    // ── Floating Action Button ─────────────────────────────────────────────
    fab: {
      position: 'absolute',
      right: 20,
      width: 54,
      height: 54,
      borderRadius: 27,
      overflow: 'hidden',
      // shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    },
    fabGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Empty states ───────────────────────────────────────────────────────
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: 10,
    },
    emptyIcon: { fontSize: 40 },
    emptyText: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptyHint: {
      ...typography.caption,
      color: colors.textSubtle,
      textAlign: 'center',
    },
    emptyBtn: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.royal,
      borderWidth: 1,
      borderColor: colors.electric,
    },
    emptyBtnText: {
      ...typography.bodyStrong,
      color: colors.textBrandStrong,
    },

    // ── About / Rating ─────────────────────────────────────────────────────
    aboutWrap: {
      margin: spacing.lg,
      backgroundColor: colors.bgSurface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 13,
    },
    aboutRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSoft,
    },
    aboutLabel: {
      flex: 1,
      ...typography.body,
      color: colors.textSecondary,
    },
    aboutValue: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
      textAlign: 'right',
    },
  });
}
