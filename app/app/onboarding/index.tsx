import { OnboardingDots } from '@/components/onboarding/OnboardingDots';
import {
  ExploreSlideVisual,
  FeaturesSlideVisual,
  WelcomeSlideVisual,
} from '@/components/onboarding/OnboardingSlideVisuals';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import {
  ONBOARDING_NEXT_LABEL,
  ONBOARDING_SKIP_LABEL,
  ONBOARDING_SLIDES,
  ONBOARDING_START_LABEL,
} from '@/constants/onboardingCopy';
import { layout, motion, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { paddingStart, rtlDirection } from '@/lib/rtl';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SLIDE_VISUALS = [WelcomeSlideVisual, FeaturesSlideVisual, ExploreSlideVisual] as const;

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const { gradients } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const staticFade = useRef(new Animated.Value(1)).current;
  const staticSlide = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<(typeof ONBOARDING_SLIDES)[number]>>(null);

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const animateSlideContent = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: motion.normal,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        mass: motion.spring.mass,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    animateSlideContent();
  }, [currentIndex, animateSlideContent]);

  const finishOnboarding = useCallback(async () => {
    await completeOnboarding();
    router.replace(isAuthenticated ? '/(tabs)' : '/auth/phone');
  }, [completeOnboarding, isAuthenticated, router]);

  const handleSkip = useCallback(() => {
    void finishOnboarding();
  }, [finishOnboarding]);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      void finishOnboarding();
      return;
    }
    listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  }, [currentIndex, finishOnboarding, isLastSlide]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setCurrentIndex(index);
    },
    [width],
  );

  const renderSlide = useCallback(
    ({ item, index }: ListRenderItemInfo<(typeof ONBOARDING_SLIDES)[number]>) => {
      const Visual = SLIDE_VISUALS[index];
      const active = index === currentIndex;

      return (
        <View style={[styles.slide, { width }]}>
          <View style={styles.visualArea}>
            <Visual
              fadeAnim={active ? fadeAnim : staticFade}
              slideAnim={active ? slideAnim : staticSlide}
            />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        </View>
      );
    },
    [currentIndex, fadeAnim, slideAnim, staticFade, staticSlide, styles, width],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.hero} style={StyleSheet.absoluteFillObject} />
      <View style={styles.patternTop} />
      <View style={styles.patternBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ONBOARDING_SKIP_LABEL}
            onPress={handleSkip}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.skipPressed]}
          >
            <Text style={styles.skipText}>{ONBOARDING_SKIP_LABEL}</Text>
          </Pressable>
        </View>

        <Animated.FlatList
          ref={listRef}
          data={ONBOARDING_SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.footer}>
          <OnboardingDots
            count={ONBOARDING_SLIDES.length}
            activeIndex={currentIndex}
            scrollX={scrollX}
            slideWidth={width}
          />
          <PrimaryButton
            title={isLastSlide ? ONBOARDING_START_LABEL : ONBOARDING_NEXT_LABEL}
            onPress={handleNext}
            fullWidth
            icon={isLastSlide ? 'checkmark' : 'angle-left'}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bgDeep,
      ...rtlDirection,
    },
    patternTop: {
      position: 'absolute',
      top: -80,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: `${colors.electric}10`,
    },
    patternBottom: {
      position: 'absolute',
      bottom: 120,
      left: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: `${colors.glow}08`,
    },
    safe: {
      flex: 1,
    },
    header: {
      alignItems: 'flex-start',
      ...paddingStart(layout.screenPadding),
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    skipBtn: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    skipPressed: { opacity: 0.7 },
    skipText: {
      ...typography.bodyStrong,
      color: colors.textMuted,
    },
    list: { flex: 1 },
    listContent: {
      alignItems: 'stretch',
    },
    slide: {
      flex: 1,
      paddingHorizontal: layout.screenPadding,
      justifyContent: 'space-between',
    },
    visualArea: {
      flex: 1,
      justifyContent: 'center',
      maxHeight: '58%',
    },
    textBlock: {
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
      fontSize: 30,
      lineHeight: 40,
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 26,
    },
    footer: {
      paddingHorizontal: layout.screenPadding,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
      maxWidth: layout.contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
    },
  });
}
