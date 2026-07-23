import { AppIcon } from '@/components/ui/FlaticonIcon';
import { Image, uriSource } from '@/components/ui/AppImage';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { getCountryInfo } from '@/services/types';
import { rtlBackIcon, rtlRow } from '@/lib/rtl';

export type ProfileTabKey = 'posts' | 'ads';

export type ProfileDisplayUser = {
  id: string;
  username: string;
  displayName: string;
  arabicName: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  country?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
};

type ProfileScreenLayoutProps = {
  mode: 'own' | 'visitor';
  user: ProfileDisplayUser;
  postsContent: ReactNode;
  adsContent: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  onMenu?: () => void;
  onBack?: () => void;
  onShare?: () => void;
  onEditProfile?: () => void;
  onEditAvatar?: () => void;
  onAvatarPress?: () => void;
  hasStoryRing?: boolean;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  followLoading?: boolean;
  isFollowing?: boolean;
  initialTab?: ProfileTabKey;
};

function formatStatCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}م`;
  }
  if (n >= 10_000) {
    const v = n / 1_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} ألف`;
  }
  return n.toLocaleString('en-US');
}

export function ProfileScreenLayout({
  mode,
  user,
  postsContent,
  adsContent,
  refreshing = false,
  onRefresh,
  onMenu,
  onBack,
  onShare,
  onEditProfile,
  onEditAvatar,
  onAvatarPress,
  hasStoryRing = false,
  onFollowersPress,
  onFollowingPress,
  onFollow,
  onMessage,
  followLoading = false,
  isFollowing = false,
  initialTab = 'posts',
}: ProfileScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));
  const [activeTab, setActiveTab] = useState<ProfileTabKey>(initialTab);

  const displayName = user.arabicName || user.displayName || user.username;
  const country = getCountryInfo(user.country);

  const stats = useMemo(
    () => [
      {
        key: 'following',
        value: formatStatCount(user.followingCount),
        label: 'المتابَعون',
        onPress: onFollowingPress,
      },
      {
        key: 'followers',
        value: formatStatCount(user.followersCount),
        label: 'المتابعون',
        onPress: onFollowersPress,
      },
      {
        key: 'posts',
        value: formatStatCount(user.postsCount),
        label: 'المنشورات',
      },
    ],
    [
      user.followersCount,
      user.followingCount,
      user.postsCount,
      onFollowersPress,
      onFollowingPress,
    ],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.electricBright}
            />
          ) : undefined
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + 24,
        }}
      >
        <View style={styles.headerBlock}>
          <View style={[styles.toolbar, rtlRow]}>
            <View style={[styles.toolbarStart, rtlRow]}>
              {mode === 'own' && onEditProfile ? (
                <Pressable onPress={onEditProfile} hitSlop={10} style={styles.iconBtn}>
                  <AppIcon name="pencil-outline" size={20} color={themeColors.textPrimary} />
                </Pressable>
              ) : null}
              {mode === 'visitor' && onMenu ? (
                <Pressable onPress={onMenu} hitSlop={10} style={styles.iconBtn}>
                  <AppIcon name="menu" size={22} color={themeColors.textPrimary} />
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.toolbarEnd, rtlRow]}>
              {mode === 'visitor' && onBack ? (
                <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
                  <AppIcon name={rtlBackIcon} size={22} color={themeColors.textPrimary} />
                </Pressable>
              ) : null}
              {onShare ? (
                <Pressable onPress={onShare} hitSlop={10} style={styles.iconBtn}>
                  <AppIcon name="share-social-outline" size={20} color={themeColors.textPrimary} />
                </Pressable>
              ) : null}
              {mode === 'own' && onMenu ? (
                <Pressable onPress={onMenu} hitSlop={10} style={styles.iconBtn}>
                  <AppIcon name="menu" size={22} color={themeColors.textPrimary} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={[styles.identityRow, rtlRow]}>
            <View style={styles.infoCol}>
              <View style={[styles.nameRow, rtlRow]}>
                <Text style={styles.displayName} numberOfLines={2}>
                  {displayName}
                </Text>
                {user.verified ? (
                  <AppIcon name="checkmark-circle" size={18} color={themeColors.electricBright} />
                ) : null}
              </View>

              <View style={styles.handlePill}>
                <Text style={styles.handleText}>@{user.username}</Text>
              </View>

              <View style={[styles.statsRow, rtlRow]}>
                {stats.map((stat, index) => (
                  <View key={stat.key} style={[styles.statGroup, rtlRow]}>
                    {index > 0 ? <View style={styles.statDivider} /> : null}
                    {stat.onPress ? (
                      <Pressable style={styles.statItem} onPress={stat.onPress}>
                        <Text style={styles.statNum}>{stat.value}</Text>
                        <Text style={styles.statLbl}>{stat.label}</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.statItem}>
                        <Text style={styles.statNum}>{stat.value}</Text>
                        <Text style={styles.statLbl}>{stat.label}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {!!user.bio ? (
                <Text style={styles.bio} numberOfLines={3}>
                  {user.bio}
                </Text>
              ) : null}

              <View style={[styles.locationRow, rtlRow]}>
                <AppIcon name="map-marker-outline" size={14} color={themeColors.textMuted} />
                <Text style={styles.locationText}>
                  {country.flag} {country.ar}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onAvatarPress}
              disabled={!onAvatarPress}
              style={styles.avatarCol}
            >
              <LinearGradient
                colors={
                  hasStoryRing
                    ? [themeColors.electricBright, themeColors.cyan, '#34D399']
                    : [themeColors.borderSoft, themeColors.borderSoft]
                }
                style={styles.avatarRing}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.avatarClip}>
                  <Image
                    source={uriSource(user.avatar)}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                </View>
              </LinearGradient>
              {mode === 'own' && onEditAvatar ? (
                <Pressable style={styles.cameraBtn} onPress={onEditAvatar} hitSlop={8}>
                  <AppIcon name="camera-outline" size={14} color="#fff" />
                </Pressable>
              ) : null}
            </Pressable>
          </View>

          {mode === 'visitor' && (onFollow || onMessage) ? (
            <View style={[styles.actionsRow, rtlRow]}>
              {onMessage ? (
                <Pressable style={styles.btnMessage} onPress={onMessage}>
                  <Text style={styles.btnMessageText}>مراسلة</Text>
                </Pressable>
              ) : null}
              {onFollow ? (
                <Pressable
                  onPress={onFollow}
                  disabled={followLoading}
                  style={[styles.btnFollow, isFollowing && styles.btnFollowing]}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? themeColors.textPrimary : '#fff'}
                    />
                  ) : (
                    <Text style={[styles.btnFollowText, isFollowing && styles.btnFollowingText]}>
                      {isFollowing ? 'متابَع' : 'متابعة'}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.tabsBar}>
          <View style={[styles.tabsRow, rtlRow]}>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('posts')}>
              <Text style={[styles.tabLabel, activeTab === 'posts' && styles.tabLabelActive]}>
                المنشورات
              </Text>
              {activeTab === 'posts' ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('ads')}>
              <Text style={[styles.tabLabel, activeTab === 'ads' && styles.tabLabelActive]}>
                الإعلانات
              </Text>
              {activeTab === 'ads' ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>{activeTab === 'posts' ? postsContent : adsContent}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bgDeep,
    },
    headerBlock: {
      backgroundColor: colors.bgDeep,
      paddingBottom: spacing.sm,
    },
    toolbar: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
      minHeight: 44,
    },
    toolbarStart: {
      alignItems: 'center',
      gap: 4,
    },
    toolbarEnd: {
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityRow: {
      alignItems: 'flex-start',
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    infoCol: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    nameRow: {
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    displayName: {
      ...typography.h2,
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'right',
      writingDirection: 'rtl',
      flexShrink: 1,
    },
    handlePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.bgElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    handleText: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '600',
      writingDirection: 'rtl',
    },
    statsRow: {
      alignItems: 'stretch',
      marginTop: 4,
      width: '100%',
    },
    statGroup: {
      flex: 1,
      alignItems: 'stretch',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      gap: 2,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderMid,
      marginVertical: 10,
      alignSelf: 'stretch',
    },
    statNum: {
      ...typography.bodyStrong,
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    statLbl: {
      ...typography.micro,
      color: colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    bio: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginTop: 2,
    },
    locationRow: {
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    locationText: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 12,
      writingDirection: 'rtl',
    },
    avatarCol: {
      position: 'relative',
      paddingTop: 2,
    },
    avatarRing: {
      width: 92,
      height: 92,
      borderRadius: 46,
      padding: 2.5,
    },
    avatarClip: {
      width: '100%',
      height: '100%',
      borderRadius: 44,
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: colors.bgDeep,
      backgroundColor: colors.bgElevated,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    cameraBtn: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.electric,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bgDeep,
    },
    actionsRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    btnFollow: {
      flex: 1.4,
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.electric,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnFollowing: {
      backgroundColor: colors.bgSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMid,
    },
    btnFollowText: {
      ...typography.bodyStrong,
      color: '#fff',
      fontWeight: '700',
    },
    btnFollowingText: {
      color: colors.textPrimary,
    },
    btnMessage: {
      flex: 1,
      height: 42,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMid,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnMessageText: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    tabsBar: {
      backgroundColor: colors.bgDeep,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSoft,
    },
    tabsRow: {
      paddingHorizontal: spacing.lg,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 8,
      position: 'relative',
    },
    tabLabel: {
      ...typography.bodyStrong,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textMuted,
      writingDirection: 'rtl',
    },
    tabLabelActive: {
      color: colors.electric,
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: spacing.md,
      right: spacing.md,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.electric,
    },
    body: {
      backgroundColor: colors.bgDeep,
      minHeight: 200,
    },
  });
}
