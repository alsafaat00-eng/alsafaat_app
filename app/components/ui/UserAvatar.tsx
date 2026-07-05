import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, uriSource } from '@/components/ui/AppImage';
import { typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';

type UserAvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

function pickInitial(name?: string): string {
  const source = (name || '?').trim();
  if (!source) return '?';
  const first = source.charAt(0);
  return /[\u0600-\u06FF]/.test(first) ? first : first.toUpperCase();
}

export function UserAvatar({ uri, name, size = 48, style }: UserAvatarProps) {
  const styles = useThemedStyles(({ colors }) => createStyles(colors, size));
  const [failed, setFailed] = useState(false);
  const source = uriSource(failed ? undefined : uri);

  if (source) {
    return (
      <Image
        source={source}
        style={[styles.avatar, style]}
        contentFit="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.avatar, styles.fallback, style]}>
      <Text style={styles.initial}>{pickInitial(name)}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors, size: number) {
  const radius = size / 2;
  return StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: radius,
    },
    fallback: {
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMid,
    },
    initial: {
      ...typography.bodyStrong,
      color: colors.textBrandStrong,
      fontSize: Math.round(size * 0.38),
    },
  });
}
