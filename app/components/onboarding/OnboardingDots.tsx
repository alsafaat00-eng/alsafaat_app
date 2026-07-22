import { Animated, StyleSheet, View } from 'react-native';
import { spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { rtlRow } from '@/lib/rtl';

type OnboardingDotsProps = {
  count: number;
  activeIndex: number;
  scrollX: Animated.Value;
  slideWidth: number;
};

export function OnboardingDots({ count, activeIndex, scrollX, slideWidth }: OnboardingDotsProps) {
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, index) => {
        const inputRange = [
          (index - 1) * slideWidth,
          index * slideWidth,
          (index + 1) * slideWidth,
        ];
        const width = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.35, 1, 0.35],
          extrapolate: 'clamp',
        });
        const isActive = index === activeIndex;

        return (
          <Animated.View
            key={index}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[
              styles.dot,
              isActive && styles.dotActive,
              { width, opacity },
            ]}
          />
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      ...rtlRow,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.electric,
    },
    dotActive: {
      backgroundColor: colors.glow,
    },
  });
}
