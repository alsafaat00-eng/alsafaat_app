import { AppIcon } from '@/components/ui/FlaticonIcon';
import { AppLogo } from '@/components/ui/AppLogo';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { rtlRow } from '@/lib/rtl';

const FEATURE_ITEMS = [
  { emoji: '🐑', label: 'المواشي', icon: 'sheep' as const, tint: '#10B981' },
  { emoji: '🥩', label: 'الملاحم', icon: 'shop' as const, tint: '#006B3C' },
  { emoji: '🌾', label: 'الأعلاف', icon: 'box' as const, tint: '#34D399' },
  { emoji: '🛠️', label: 'الخدمات', icon: 'tool-box' as const, tint: '#008F4C' },
] as const;

const MOCK_LISTINGS = [
  { title: 'خروف نعيمي', price: '2,400 ر.س', tag: 'جديد' },
  { title: 'أعلاف طبيعية', price: '180 ر.س', tag: 'مميز' },
  { title: 'ملحمة الرياض', price: 'خدمات', tag: 'قريب' },
] as const;

type SlideVisualProps = {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
};

export function WelcomeSlideVisual({ fadeAnim, slideAnim }: SlideVisualProps) {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  return (
    <Animated.View
      style={[
        styles.visualWrap,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <LinearGradient colors={gradients.hero} style={styles.heroGlow} />
      <AppLogo size={108} />
      <View style={styles.livestockRing}>
        <View style={[styles.livestockBadge, styles.badgeTop]}>
          <Text style={styles.livestockEmoji}>🐑</Text>
        </View>
        <View style={[styles.livestockBadge, styles.badgeRight]}>
          <Text style={styles.livestockEmoji}>🐐</Text>
        </View>
        <View style={[styles.livestockBadge, styles.badgeBottom]}>
          <Text style={styles.livestockEmoji}>🐪</Text>
        </View>
        <View style={[styles.livestockBadge, styles.badgeLeft]}>
          <AppIcon name="cow" size={22} color={colors.glow} />
        </View>
      </View>
    </Animated.View>
  );
}

export function FeaturesSlideVisual({ fadeAnim, slideAnim }: SlideVisualProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  return (
    <Animated.View
      style={[
        styles.featuresWrap,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.featureGrid}>
        {FEATURE_ITEMS.map((item, index) => (
          <GlassCard key={item.label} style={styles.featureCard} padding={spacing.lg} glow={index === 0}>
            <View style={[styles.featureIconWrap, { backgroundColor: `${item.tint}22` }]}>
              <Text style={styles.featureEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.featureLabel}>{item.label}</Text>
            <View style={styles.featureIconHint}>
              <AppIcon name={item.icon} size={14} color={colors.textMuted} />
            </View>
          </GlassCard>
        ))}
      </View>
    </Animated.View>
  );
}

export function ExploreSlideVisual({ fadeAnim, slideAnim }: SlideVisualProps) {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  return (
    <Animated.View
      style={[
        styles.exploreWrap,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <GlassCard style={styles.feedCard} padding={spacing.md} elevated glow>
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>أحدث الإعلانات</Text>
          <View style={styles.feedLiveDot} />
        </View>
        {MOCK_LISTINGS.map((item, index) => (
          <View key={item.title} style={[styles.feedRow, index < MOCK_LISTINGS.length - 1 && styles.feedRowBorder]}>
            <LinearGradient
              colors={gradients.electric}
              style={styles.feedThumb}
            >
              <AppIcon name={index === 0 ? 'sheep' : index === 1 ? 'box' : 'shop'} size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.feedMeta}>
              <Text style={styles.feedItemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.feedPrice}>{item.price}</Text>
            </View>
            <View style={styles.feedTag}>
              <Text style={styles.feedTagText}>{item.tag}</Text>
            </View>
          </View>
        ))}
      </GlassCard>
      <View style={styles.postPreview}>
        <View style={styles.postAvatar}>
          <AppIcon name="user" size={16} color={colors.glow} />
        </View>
        <View style={styles.postBubble}>
          <Text style={styles.postText} numberOfLines={2}>
            منشور يومي من مزارع في منطقتك — تابع آخر العروض والأسعار
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    visualWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 280,
      position: 'relative',
    },
    orbLarge: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: `${colors.electric}12`,
      top: '8%',
    },
    orbSmall: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${colors.glow}10`,
      bottom: '12%',
      right: '8%',
    },
    heroGlow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      opacity: 0.35,
    },
    livestockRing: {
      position: 'absolute',
      width: 200,
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    livestockBadge: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeTop: { top: 0 },
    badgeRight: { right: 0 },
    badgeBottom: { bottom: 0 },
    badgeLeft: { left: 0 },
    livestockEmoji: { fontSize: 22 },

    featuresWrap: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
      minHeight: 300,
    },
    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'center',
    },
    featureCard: {
      width: '46%',
      minWidth: 140,
      maxWidth: 168,
      alignItems: 'center',
      gap: spacing.sm,
    },
    featureIconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureEmoji: { fontSize: 28 },
    featureLabel: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    featureIconHint: { opacity: 0.6 },
    commissionPill: {
      ...rtlRow,
      alignSelf: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.bgGlass,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    commissionText: {
      ...typography.caption,
      color: colors.textBrandStrong,
    },

    exploreWrap: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
      minHeight: 300,
    },
    feedCard: {
      width: '100%',
    },
    feedHeader: {
      ...rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    feedTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    feedLiveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.liveRed,
    },
    feedRow: {
      ...rtlRow,
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    feedRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderHairline,
    },
    feedThumb: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedMeta: { flex: 1, gap: 2 },
    feedItemTitle: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    feedPrice: {
      ...typography.caption,
      color: colors.textBrandStrong,
    },
    feedTag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
      backgroundColor: `${colors.glow}22`,
    },
    feedTagText: {
      ...typography.micro,
      color: colors.glow,
      letterSpacing: 0,
    },
    postPreview: {
      ...rtlRow,
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    postAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    postBubble: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    postText: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
}
