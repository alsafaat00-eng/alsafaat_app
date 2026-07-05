import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { getFlaticonIconSet } from '@/lib/flaticonIconSets';
import { resolveFlaticonIcon } from '@/lib/flaticonAliases';
import type { FlaticonStyle } from '@/constants/flaticon-glyphs';

export type FlaticonIconProps = {
  /** Icon name (Flaticon or legacy Ionicons/MaterialCommunityIcons — auto-mapped) */
  name: string;
  /** rr = regular rounded, sr = solid rounded, br = bold rounded */
  variant?: FlaticonStyle;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Flaticon Uicons (icon font) — https://www.flaticon.com/uicons
 * Browse names: fi-rr-{name}, fi-sr-{name}, fi-br-{name}
 */
export function FlaticonIcon({
  name,
  variant = 'rr',
  size = 24,
  color,
  style,
}: FlaticonIconProps) {
  const Icon = getFlaticonIconSet(variant);
  const resolved = resolveFlaticonIcon(name);
  return <Icon name={resolved} size={size} color={color} style={style} />;
}

/** Same as FlaticonIcon — preferred import for new UI. */
export const AppIcon = FlaticonIcon;
