type ExpoVideoModule = {
  useVideoPlayer: (
    source: string,
    setup: (player: {
      loop: boolean;
      muted: boolean;
      play: () => void;
      currentTime: number;
      playing: boolean;
      status: string;
      addListener: (
        event: string,
        cb: (payload: { currentTime?: number; status?: string; isPlaying?: boolean }) => void,
      ) => { remove: () => void };
    }) => void,
  ) => unknown;
  VideoView: React.ComponentType<Record<string, unknown>>;
};

let cached: ExpoVideoModule | null | undefined;

/** Load expo-video once; require() throws if native ExpoVideo is missing from the APK. */
export function getExpoVideoModule(): ExpoVideoModule | null {
  if (cached !== undefined) return cached;

  try {
    cached = require('expo-video') as ExpoVideoModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function isExpoVideoNativeAvailable(): boolean {
  return getExpoVideoModule() != null;
}

export function resetExpoVideoModuleCache(): void {
  cached = undefined;
}
