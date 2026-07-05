import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { FLATICON_FONT_FILES, FLATICON_FONT_FAMILIES } from '@/constants/flaticon-glyphs';
import { flaticonIconSets } from '@/lib/flaticonIconSets';

export function useFlaticonFonts() {
  const [loaded, error] = useFonts({
    [FLATICON_FONT_FAMILIES.rr]: FLATICON_FONT_FILES.rr,
    [FLATICON_FONT_FAMILIES.sr]: FLATICON_FONT_FILES.sr,
    [FLATICON_FONT_FAMILIES.br]: FLATICON_FONT_FILES.br,
  });

  useEffect(() => {
    void Promise.all([
      flaticonIconSets.rr.loadFont(),
      flaticonIconSets.sr.loadFont(),
      flaticonIconSets.br.loadFont(),
    ]).catch(() => {});
  }, []);

  return { loaded, error };
}
