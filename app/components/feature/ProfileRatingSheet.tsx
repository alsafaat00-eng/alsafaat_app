import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';

type ProfileRatingSheetProps = {
  visible: boolean;
  onClose: () => void;
  targetName: string;
  rating: number | null;
  reviewCount: number;
  readOnly?: boolean;
};

export function ProfileRatingSheet({
  visible,
  onClose,
  targetName,
  rating,
  reviewCount,
  readOnly = false,
}: ProfileRatingSheetProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));
  const hasRating = rating != null && reviewCount > 0;
  const rounded = hasRating ? rating.toFixed(1) : '—';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>تقييم الحساب</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {targetName}
          </Text>

          <View style={styles.scoreCircle}>
            <AppIcon name="star" size={28} color={colors.gold} />
            <Text style={styles.scoreValue}>{rounded}</Text>
            <Text style={styles.scoreHint}>
              {reviewCount > 0
                ? `${reviewCount.toLocaleString('ar-SA')} تقييم`
                : 'لا توجد تقييمات بعد'}
            </Text>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <AppIcon
                key={n}
                name={hasRating && n <= Math.round(rating!) ? 'star' : 'star-outline'}
                size={22}
                color={hasRating && n <= Math.round(rating!) ? colors.gold : colors.textSubtle}
              />
            ))}
          </View>

          <Text style={styles.note}>
            {readOnly
              ? 'يُحسب تقييمك من تقييمات المستخدمين الآخرين لحسابك في المنصة.'
              : 'يمكنك تعديل تقييمك في أي وقت من صفحة المستخدم.'}
          </Text>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>حسناً</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.52)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgSurface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
      alignItems: 'center',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderMid,
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 4,
    },
    scoreCircle: {
      marginTop: spacing.xl,
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radius.xl,
      backgroundColor: colors.bgGlass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      minWidth: 160,
    },
    scoreValue: {
      ...typography.h1,
      fontSize: 32,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    scoreHint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    starsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: spacing.lg,
    },
    note: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    closeBtn: {
      marginTop: spacing.xl,
      width: '100%',
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.electric,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      ...typography.bodyStrong,
      color: '#fff',
    },
  });
}
