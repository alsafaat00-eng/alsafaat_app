export type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    title: 'مرحبًا بك في سرح',
    description: 'كل ما يخص المواشي في مكان واحد.',
  },
  {
    id: 'features',
    title: 'كل ما تحتاجه في سرح',
    description: 'مواشي • ملاحم • أعلاف • خدمات\nمنصة موثوقة للبيع والشراء.',
  },
  {
    id: 'explore',
    title: 'تابع واستكشف',
    description: 'اكتشف أحدث الإعلانات والمنشورات اليومية في منطقتك.',
  },
];

export const ONBOARDING_SKIP_LABEL = 'تخطي';
export const ONBOARDING_NEXT_LABEL = 'التالي';
export const ONBOARDING_START_LABEL = 'ابدأ الآن';
