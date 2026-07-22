// Powered by OnSpace.AI
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { Image, uriSource } from '@/components/ui/AppImage';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  radius,
  scrimColor,
  spacing,
  typography,
  panelSurfaceBg,
  type ThemeColors,
} from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { rtlDirection, rtlForwardIcon, rtlRow } from '@/lib/rtl';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/contexts/AuthContext';
import { ButchersSidebarEntry } from '@/components/feature/ButchersSidebarEntry';
import { BRAND_DISPLAY_NAME } from '@/constants/brandCopy';

type MenuItem = {
  key: string;
  icon: string;
  label: string;
  subtitle?: string;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
};

function SidebarMenuRow({
  item,
  colors,
  onPress,
  showDivider,
}: {
  item: MenuItem;
  colors: ThemeColors;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.row,
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderHairline,
        },
        pressed && rowStyles.rowPressed,
      ]}
    >
      <View style={rowStyles.leading}>
        <View
          style={[
            rowStyles.iconBubble,
            {
              backgroundColor: item.danger ? `${colors.rose}14` : `${colors.electric}10`,
              borderColor: item.danger ? `${colors.rose}30` : `${colors.electric}22`,
            },
          ]}
        >
          <AppIcon
            name={item.icon}
            size={18}
            color={item.danger ? colors.rose : colors.textBrandStrong}
          />
        </View>
        <View style={rowStyles.textWrap}>
          <Text style={[rowStyles.label, { color: item.danger ? colors.rose : colors.textPrimary }]}>
            {item.label}
          </Text>
          {item.subtitle ? (
            <Text style={[rowStyles.subtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
          ) : null}
        </View>
      </View>
      {!item.danger ? <AppIcon name={rtlForwardIcon} size={17} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    ...rtlRow,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 54,
  },
  rowPressed: {
    opacity: 0.78,
  },
  leading: {
    ...rtlRow,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
    minWidth: 0,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flexShrink: 1,
    gap: 2,
  },
  label: { ...typography.bodyStrong, fontSize: 15 },
  subtitle: { ...typography.caption },
});

export default function SidebarScreen() {
  const router = useRouter();
  const { me, posts } = useApp();
  const { signOut } = useAuth();
  const { preference, setPreference, scheme, colors, gradients } = useTheme();
  const styles = useThemedStyles((theme) => createSidebarStyles(theme.colors, theme.scheme));

  const postsCount = me.postsCount ?? posts.filter((p) => p.author.id === me.id).length;

  const handleNav = (route: string) => {
    router.back();
    setTimeout(() => router.push(route as any), 120);
  };

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد أنك تريد الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await signOut();
          setTimeout(() => router.replace('/auth/phone' as any), 300);
        },
      },
    ]);
  };

  const themeLabel =
    preference === 'light' ? 'الوضع الفاتح' : preference === 'dark' ? 'الوضع الداكن' : 'حسب النظام';
  const themeSubtitle =
    preference === 'light' ? 'مفعّل' : preference === 'dark' ? 'مفعّل' : 'يتبع إعدادات الجهاز';

  const cycleTheme = () => {
    const next = preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light';
    setPreference(next);
  };

  return (
    <View style={[styles.backdrop, rtlRow]}>
      <SafeAreaView style={styles.panel} edges={['top', 'bottom']}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>القائمة</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
            <AppIcon name="close-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, rtlDirection]}
        >
          <Pressable
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/(tabs)/profile'), 100);
            }}
            style={({ pressed }) => [styles.heroCard, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={gradients.royal}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.avatarRing}>
                <Image source={uriSource(me.avatar)} style={styles.avatar} contentFit="cover" />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {me.arabicName || me.displayName || 'حسابي'}
                </Text>
                <Text style={styles.profileHandle}>@{me.username || 'user'}</Text>
              </View>
              <AppIcon name={rtlForwardIcon} size={18} color="rgba(255,255,255,0.85)" />
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{me.followers.toLocaleString('en-US')}</Text>
                <Text style={styles.heroStatLbl}>متابعون</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{me.following.toLocaleString('en-US')}</Text>
                <Text style={styles.heroStatLbl}>متابَعون</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{postsCount.toLocaleString('en-US')}</Text>
                <Text style={styles.heroStatLbl}>منشورات</Text>
              </View>
            </View>
          </Pressable>

          <Text style={styles.sectionLabel}>الخدمات</Text>
          <View style={styles.menuCard}>
            <ButchersSidebarEntry />
            <SidebarMenuRow
              item={{ key: 'notifications', icon: 'bell-outline', label: 'مركز الإشعارات' }}
              colors={colors}
              showDivider
              onPress={() => handleNav('/notifications')}
            />
            <SidebarMenuRow
              item={{ key: 'messages', icon: 'chatbubbles-outline', label: 'الرسائل' }}
              colors={colors}
              showDivider
              onPress={() => handleNav('/(tabs)/messages')}
            />
            <SidebarMenuRow
              item={{ key: 'subscription', icon: 'crown-outline', label: 'الباقات والاشتراك' }}
              colors={colors}
              onPress={() => handleNav('/subscription')}
            />
          </View>

          <Text style={styles.sectionLabel}>التفضيلات</Text>
          <View style={styles.menuCard}>
            <SidebarMenuRow
              item={{
                key: 'theme',
                icon:
                  preference === 'dark'
                    ? 'weather-night'
                    : preference === 'light'
                      ? 'white-balance-sunny'
                      : 'theme-light-dark',
                label: themeLabel,
                subtitle: themeSubtitle,
              }}
              colors={colors}
              onPress={cycleTheme}
            />
          </View>

          <View style={[styles.menuCard, styles.logoutCard]}>
            <SidebarMenuRow
              item={{
                key: 'logout',
                icon: 'log-out-outline',
                label: 'تسجيل الخروج',
                danger: true,
              }}
              colors={colors}
              onPress={handleSignOut}
            />
          </View>

          <Text style={styles.versionText}>{BRAND_DISPLAY_NAME} · الإصدار ١.٠.٠</Text>
        </ScrollView>
      </SafeAreaView>

      <Pressable style={styles.backdropTap} onPress={() => router.back()} />
    </View>
  );
}

function createSidebarStyles(colors: ThemeColors, scheme: 'light' | 'dark') {
  const panelBg = panelSurfaceBg(scheme, colors);

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: scrimColor(scheme, 0.55),
    },
    backdropTap: {
      flex: 1,
    },
    panel: {
      width: '88%',
      maxWidth: 400,
      alignSelf: 'stretch',
      backgroundColor: panelBg,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.borderMid,
      borderTopLeftRadius: 28,
      borderBottomLeftRadius: 28,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: scheme === 'dark' ? -6 : -2, height: 0 },
      shadowOpacity: scheme === 'dark' ? 0.4 : 0.14,
      shadowRadius: 18,
      elevation: 12,
    },
    panelHeader: {
      ...rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    panelTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgGlass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    scroll: {
      flex: 1,
      ...rtlDirection,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxxl,
      gap: spacing.sm,
    },
    heroCard: {
      borderRadius: 22,
      overflow: 'hidden',
      marginBottom: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.12)',
    },
    heroContent: {
      ...rtlRow,
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    avatarRing: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 2.5,
      borderColor: 'rgba(255,255,255,0.9)',
      overflow: 'hidden',
      backgroundColor: colors.bgElevated,
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    heroText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    profileName: {
      ...typography.bodyStrong,
      fontSize: 17,
      color: '#fff',
      fontWeight: '800',
    },
    profileHandle: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.82)',
    },
    heroStats: {
      ...rtlRow,
      justifyContent: 'space-around',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      paddingTop: spacing.xs,
    },
    heroStat: {
      alignItems: 'center',
      flex: 1,
      gap: 2,
    },
    heroStatNum: {
      ...typography.bodyStrong,
      color: '#fff',
      fontWeight: '800',
      fontSize: 15,
    },
    heroStatLbl: {
      ...typography.micro,
      color: 'rgba(255,255,255,0.78)',
      fontSize: 10,
    },
    heroStatDivider: {
      width: StyleSheet.hairlineWidth,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontWeight: '700',
      marginTop: spacing.sm,
      marginBottom: 2,
      paddingHorizontal: spacing.xs,
    },
    menuCard: {
      borderRadius: 18,
      backgroundColor: colors.bgGlass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      overflow: 'hidden',
    },
    logoutCard: {
      marginTop: spacing.xs,
    },
    versionText: {
      ...typography.micro,
      color: colors.textSubtle,
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
  });
}
