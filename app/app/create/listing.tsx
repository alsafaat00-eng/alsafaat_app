// Powered by OnSpace.AI
// SAFAT — Create Listing Screen (إنشاء إعلان)
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { PublishSuccessModal } from '@/components/ui/PublishSuccessModal';

import { Image } from '@/components/ui/AppImage';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { rtlBackIcon } from '@/lib/rtl';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/contexts/AuthContext';
import { Country } from '@/services/types';
import { uploadImageFromUri } from '@/services/upload';
import { LocationMapPreview } from '@/components/feature/LocationMapPreview';
import * as Location from 'expo-location';
import { hasValidCoords } from '@/lib/butcherLocation';
import { isLivestockCategory } from '@/lib/listingCategories';

type Category = 'camels' | 'sheep' | 'goats' | 'cows' | 'horses' | 'birds' | 'feed' | 'equipment';

const CATEGORIES: { id: Category; ar: string; icon: string }[] = [
  { id: 'camels', ar: 'إبل', icon: '🐪' },
  { id: 'sheep', ar: 'أغنام', icon: '🐑' },
  { id: 'goats', ar: 'معز', icon: '🐐' },
  { id: 'cows', ar: 'بقر', icon: '🐄' },
  { id: 'horses', ar: 'خيول', icon: '🐎' },
  { id: 'birds', ar: 'طيور', icon: '🦅' },
  { id: 'feed', ar: 'علف', icon: '🌾' },
  { id: 'equipment', ar: 'معدات', icon: '⚙️' },
];

const GCC_COUNTRIES: { code: Country; ar: string; flag: string; currency: string }[] = [
  { code: 'SA', ar: 'السعودية', flag: '🇸🇦', currency: 'SAR' },
];

const STEPS = ['النوع', 'التفاصيل', 'السعر', 'المراجعة'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAT_COLS = 4;
const CAT_GAP = spacing.md;
const CAT_CARD_SIZE =
  (SCREEN_WIDTH - spacing.lg * 2 - CAT_GAP * (CAT_COLS - 1)) / CAT_COLS;

function normalizeContactPhone(value: string, country: Country): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (country === 'SA') {
    if (digits.startsWith('0')) digits = `966${digits.slice(1)}`;
    else if (digits.length === 9 && digits.startsWith('5')) digits = `966${digits}`;
  }
  return digits ? `+${digits}` : '';
}

export default function CreateListingScreen() {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(({ colors }) => createStyles(colors));
  const router = useRouter();
  const { addListing } = useApp();
  const { accessToken } = useAuth();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [titleAr, setTitleAr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [price, setPrice] = useState('');
  const [country, setCountry] = useState<Country>('SA');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);

  const selectedCountry = GCC_COUNTRIES.find((c) => c.code === country)!;

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور لإضافتها للإعلان');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 8 - imageUris.length,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUris((prev) =>
        [...prev, ...result.assets.map((a) => a.uri)].slice(0, 8),
      );
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الموقع', 'يرجى السماح بالوصول للموقع لتحديد مكان الإعلان');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(Math.round(pos.coords.latitude * 1_000_000) / 1_000_000);
      setLng(Math.round(pos.coords.longitude * 1_000_000) / 1_000_000);

      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const city = geo?.city || geo?.subregion || geo?.region;
        if (city && !location.trim()) setLocation(city);
      } catch {
        // city name optional
      }
    } catch {
      Alert.alert('خطأ', 'تعذّر الحصول على موقعك. حاول مجدداً.');
    } finally {
      setLocating(false);
    }
  };

  const canContinue = () => {
    if (step === 0) return !!category;
    if (step === 1) {
      const needsWeight = category ? isLivestockCategory(category) : false;
      const weightValid =
        !needsWeight ||
        (/^\d+(\.\d{1,2})?$/.test(weightKg.trim()) && Number(weightKg) > 0);
      return (
        titleAr.trim().length >= 3 &&
        descAr.trim().length >= 10 &&
        imageUris.length > 0 &&
        weightValid
      );
    }
    if (step === 2) {
      const normalizedPhone = normalizeContactPhone(contactPhone, country);
      const phoneValid =
        !contactPhone.trim() || /^\+[0-9]{8,15}$/.test(normalizedPhone);
      return price.trim().length > 0 && location.trim().length > 0 && phoneValid;
    }
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!category || !accessToken) return;
    setSubmitting(true);

    try {
      const uploadedUrls: string[] = [];
      for (const uri of imageUris) {
        try {
          const url = await uploadImageFromUri(accessToken, uri, 'listings');
          uploadedUrls.push(url);
        } catch {
          if (__DEV__) {
            uploadedUrls.push(`https://picsum.photos/seed/${Date.now()}-${uploadedUrls.length}/800/600`);
          } else {
            throw new Error('تعذّر رفع الصور. تحقق من الاتصال وحاول مجدداً.');
          }
        }
      }

      if (uploadedUrls.length === 0) {
        Alert.alert('صور مطلوبة', 'يجب إضافة صورة واحدة على الأقل للإعلان.');
        setSubmitting(false);
        return;
      }

      const title = titleAr.trim();
      const result = await addListing({
        title,
        arabicTitle: title,
        description: descAr.trim(),
        arabicDescription: descAr.trim(),
        price: Number(price),
        currency: selectedCountry.currency,
        category,
        breed: breed.trim() || undefined,
        age: age.trim() || undefined,
        quantity: 1,
        location: location.trim(),
        arabicLocation: location.trim(),
        country,
        contactPhone: contactPhone.trim()
          ? normalizeContactPhone(contactPhone, country)
          : undefined,
        weightKg:
          category && isLivestockCategory(category)
            ? Number(weightKg)
            : undefined,
        images: uploadedUrls,
        featured,
      });

      if (result.ok) {
        setShowPublishSuccess(true);
      } else {
        Alert.alert(
          'خطأ',
          result.error ||
            'فشل نشر الإعلان. يرجى التحقق من المدخلات أو باقة الاشتراك الخاصة بك.',
        );
      }
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل نشر الإعلان.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            style={styles.backBtn}
            hitSlop={8}
          >
            <AppIcon name={rtlBackIcon} size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>إنشاء إعلان</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Step bar — fixed height, no vertical flex expansion */}
        <View style={styles.stepBarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stepBarScroll}
            contentContainerStyle={styles.stepBar}
          >
            {STEPS.map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                  {i < step ? (
                    <AppIcon name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]} numberOfLines={1}>
                  {s}
                </Text>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 0 - Category */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>ما نوع الإعلان؟</Text>
              <Text style={styles.stepSubtitle}>اختر تصنيف إعلانك</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[styles.catCard, category === cat.id && styles.catCardActive]}
                  >
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                    <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]}>
                      {cat.ar}
                    </Text>
                    {category === cat.id && (
                      <View style={styles.catCheck}>
                        <AppIcon name="checkmark-circle" size={16} color={colors.electricBright} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 1 - Details */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>تفاصيل الإعلان</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>عنوان الإعلان *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={titleAr}
                    onChangeText={setTitleAr}
                    placeholder="مثال: ناقة نجدية أصيلة..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { textAlign: 'right' }]}
                    maxLength={80}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الوصف *</Text>
                <View style={[styles.inputWrap, { height: 100, alignItems: 'flex-start', paddingTop: spacing.sm }]}>
                  <TextInput
                    value={descAr}
                    onChangeText={setDescAr}
                    placeholder="صف الحيوان بالتفصيل: العمر، الجنس، الحالة الصحية..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { textAlign: 'right', textAlignVertical: 'top', height: 80 }]}
                    multiline
                    maxLength={500}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>السلالة / النوع</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={breed}
                      onChangeText={setBreed}
                      placeholder="مثال: نجدية"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { textAlign: 'right' }]}
                    />
                  </View>
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>العمر</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      placeholder="مثال: 3 سنوات"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { textAlign: 'right' }]}
                    />
                  </View>
                </View>
              </View>

              {category && isLivestockCategory(category) ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>الوزن (كجم) *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={weightKg}
                      onChangeText={(v) => setWeightKg(v.replace(/[^\d.]/g, ''))}
                      placeholder="مثال: 450"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      style={[styles.input, { textAlign: 'right' }]}
                    />
                    <Text style={styles.currencyLabel}>كجم</Text>
                  </View>
                  <Text style={styles.fieldHint}>
                    إلزامي للمواشي الحية وفق متطلبات وزارة البيئة والمياه والزراعة
                  </Text>
                </View>
              ) : null}

              {/* Images */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الصور * (صورة واحدة على الأقل)</Text>
                <View style={styles.imageGrid}>
                  {imageUris.map((uri, idx) => (
                    <View key={uri} style={styles.imageThumbWrap}>
                      <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                      <Pressable style={styles.imageRemove} onPress={() => removeImage(idx)} hitSlop={6}>
                        <AppIcon name="close-circle" size={22} color={colors.rose} />
                      </Pressable>
                    </View>
                  ))}
                  {imageUris.length < 8 && (
                    <Pressable style={styles.imageAddBtn} onPress={pickImages}>
                      <AppIcon name="add" size={28} color={colors.textMuted} />
                      <Text style={styles.imagePickerText}>إضافة</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.imagePickerSub}>حتى 8 صور · JPG، PNG</Text>
              </View>
            </View>
          )}

          {/* Step 2 - Price & Location */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>السعر والموقع</Text>

              {/* Country */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الدولة</Text>
                <View style={styles.countryRow}>
                  {GCC_COUNTRIES.map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() => setCountry(c.code)}
                      style={[styles.countryChip, country === c.code && styles.countryChipActive]}
                    >
                      <Text style={styles.countryFlag}>{c.flag}</Text>
                      <Text style={[styles.countryLabel, country === c.code && { color: colors.textBrandStrong }]}>
                        {c.ar}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>السعر * ({selectedCountry.currency})</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={price}
                    onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { flex: 1, textAlign: 'right' }]}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencyLabel}>{selectedCountry.currency}</Text>
                </View>
                {price ? (
                  <Text style={styles.fieldHint}>
                    {Number(price).toLocaleString()} {selectedCountry.currency}
                  </Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الموقع على الخريطة *</Text>
                <LocationMapPreview
                  country={country}
                  cityLabel={location.trim() || undefined}
                  lat={lat}
                  lng={lng}
                  height={220}
                  showLocateButton
                  onLocate={useCurrentLocation}
                  locating={locating}
                />
                <View style={styles.inputWrap}>
                  <AppIcon name="location-outline" size={16} color={colors.textMuted} />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="مثال: الرياض"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { flex: 1, textAlign: 'right' }]}
                  />
                </View>
                {hasValidCoords(lat, lng) ? (
                  <Text style={styles.fieldHint}>✓ تم تحديد الموقع على الخريطة</Text>
                ) : (
                  <Text style={styles.mapHint}>اضغط «موقعي الحالي» أو أدخل اسم المدينة</Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>رقم التواصل عبر واتساب (اختياري)</Text>
                <View style={styles.inputWrap}>
                  <AppIcon name="whatsapp" size={18} color="#25D366" />
                  <TextInput
                    value={contactPhone}
                    onChangeText={(text) =>
                      setContactPhone(text.replace(/[^0-9+\s()-]/g, ''))
                    }
                    placeholder="مثال: +9665XXXXXXXX"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { flex: 1, textAlign: 'right' }]}
                    keyboardType="phone-pad"
                    maxLength={20}
                  />
                </View>
                <Text style={styles.mapHint}>
                  سيظهر زر واتساب في تفاصيل الإعلان عند إضافة الرقم
                </Text>
              </View>

              {/* Featured toggle */}
              <Pressable
                style={styles.featuredToggle}
                onPress={() => setFeatured(!featured)}
              >
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredTitle}>⭐ إعلان مميز</Text>
                  <Text style={styles.featuredSub}>يظهر في أعلى نتائج البحث</Text>
                </View>
                <View style={[styles.toggle, featured && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, featured && styles.toggleThumbOn]} />
                </View>
              </Pressable>
            </View>
          )}

          {/* Step 3 - Review */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>مراجعة الإعلان</Text>
              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>التصنيف</Text>
                  <Text style={styles.reviewValue}>
                    {CATEGORIES.find((c) => c.id === category)?.icon}{' '}
                    {CATEGORIES.find((c) => c.id === category)?.ar}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>العنوان</Text>
                  <Text style={styles.reviewValue}>{titleAr || '—'}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>السعر</Text>
                  <Text style={styles.reviewValue}>
                    {price ? `${Number(price).toLocaleString()} ${selectedCountry.currency}` : '—'}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>الموقع</Text>
                  <Text style={styles.reviewValue}>{location || '—'} {selectedCountry.flag}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>واتساب</Text>
                  <Text style={styles.reviewValue}>{contactPhone.trim() || 'غير مضاف'}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>الصور</Text>
                  <Text style={styles.reviewValue}>{imageUris.length} صورة</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>مميز</Text>
                  <Text style={styles.reviewValue}>{featured ? '✅ نعم' : '❌ لا'}</Text>
                </View>
              </View>

              <View style={styles.termsBox}>
                <AppIcon name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={styles.termsText}>
                  بالنشر، تؤكد أن الإعلان صحيح ويتوافق مع شروط سرح.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: spacing.md }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.continueBtn, (!canContinue() || submitting) && styles.continueBtnDisabled]}
            onPress={handleNext}
            disabled={!canContinue() || submitting}
          >
            <LinearGradient
              colors={canContinue() && !submitting ? gradients.royal : [colors.bgSurface, colors.bgSurface]}
              style={styles.continueBtnInner}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.continueBtnText, !canContinue() && { color: colors.textMuted }]}>
                  {step === STEPS.length - 1 ? '🚀 نشر الإعلان' : 'التالي ← '}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <PublishSuccessModal
          visible={showPublishSuccess}
          primaryAction={{
            label: 'عرض السوق',
            icon: 'storefront-outline',
            onPress: () => {
              setShowPublishSuccess(false);
              router.replace('/(tabs)/market');
            },
          }}
          secondaryAction={{
            label: 'حسابي',
            icon: 'person-outline',
            onPress: () => {
              setShowPublishSuccess(false);
              router.replace('/(tabs)/profile');
            },
          }}
          onRequestClose={() => setShowPublishSuccess(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
    flexShrink: 0,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.bgGlass, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  stepBarWrap: {
    flexShrink: 0,
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  stepBarScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  stepBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', minWidth: 72 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.electric, borderColor: colors.electric },
  stepNum: { ...typography.micro, color: colors.textMuted },
  stepLabel: { ...typography.micro, color: colors.textMuted, marginStart: 4, maxWidth: 56 },
  stepLabelActive: { color: colors.textBrandStrong, fontWeight: '600' },
  stepLine: { width: 20, height: 1, backgroundColor: colors.borderSoft, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.electric },
  scrollView: { flex: 1, flexShrink: 1 },
  scroll: {
    paddingBottom: spacing.lg,
    ...(Platform.OS === 'web' ? { flexGrow: 0 } : {}),
  },
  stepContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  stepTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'right' },
  stepSubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'right', marginBottom: spacing.xs },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CAT_GAP },
  catCard: {
    width: CAT_CARD_SIZE,
    height: CAT_CARD_SIZE,
    backgroundColor: colors.bgSurface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    position: 'relative',
  },
  catCardActive: { borderColor: colors.electric, backgroundColor: `${colors.electric}15` },
  catIcon: { fontSize: 24 },
  catLabel: { ...typography.micro, color: colors.textMuted, textAlign: 'center' },
  catLabelActive: { color: colors.textBrandStrong },
  catCheck: { position: 'absolute', top: 4, right: 4 },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgSurface, borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  input: {
    flex: 1, ...typography.body, color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  currencyLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  fieldHint: { ...typography.micro, color: colors.gold },
  mapHint: { ...typography.micro, color: colors.textMuted, textAlign: 'right' },
  row: { flexDirection: 'row', gap: spacing.md },
  imageGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  imageThumbWrap: {
    width: 88, height: 88, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSoft,
  },
  imageThumb: { width: '100%', height: '100%' },
  imageRemove: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(6,9,26,0.6)', borderRadius: 11,
  },
  imageAddBtn: {
    width: 88, height: 88, borderRadius: radius.lg,
    backgroundColor: colors.bgSurface, borderWidth: 1,
    borderColor: colors.borderSoft, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  imagePickerText: { ...typography.caption, color: colors.textMuted },
  imagePickerSub: { ...typography.micro, color: colors.textSubtle, textAlign: 'right' },
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  countryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.pill, backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  countryChipActive: { borderColor: colors.electric, backgroundColor: `${colors.electric}15` },
  countryFlag: { fontSize: 16 },
  countryLabel: { ...typography.caption, color: colors.textMuted },
  featuredToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, backgroundColor: colors.bgSurface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.gold}40`,
  },
  featuredInfo: { gap: 2 },
  featuredTitle: { ...typography.bodyStrong, color: colors.gold },
  featuredSub: { ...typography.caption, color: colors.textMuted },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: colors.bgElevated, justifyContent: 'center',
    paddingHorizontal: 2, borderWidth: 1, borderColor: colors.borderSoft,
  },
  toggleOn: { backgroundColor: colors.electric, borderColor: colors.electric },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  reviewCard: {
    backgroundColor: colors.bgSurface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.borderSoft, overflow: 'hidden',
  },
  reviewRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  reviewLabel: { ...typography.caption, color: colors.textMuted },
  reviewValue: { ...typography.bodyStrong, color: colors.textPrimary, textAlign: 'right' },
  termsBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    padding: spacing.md, backgroundColor: `${colors.electric}10`,
    borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.electric}20`,
  },
  termsText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 18, textAlign: 'right' },
  bottomBar: {
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bgDeep,
  },
  continueBtn: { borderRadius: radius.xl, overflow: 'hidden' },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnInner: {
    paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.xl,
  },
  continueBtnText: { ...typography.h3, color: '#fff' },
  });
}
