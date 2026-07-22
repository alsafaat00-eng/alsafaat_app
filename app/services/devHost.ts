import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getExpoDevHost(): string | null {
  if (!__DEV__) return null;

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.replace(/^exp:\/\//, '').split(':')[0] ?? null;
  }

  const debuggerHost =
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost
    ?? (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  return debuggerHost?.split(':')[0] ?? null;
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

export function resolveDevServiceUrl(envUrl: string | undefined, port: number): string {
  const fromEnv = envUrl?.replace(/\/$/, '');

  // Remote API (Railway / staging) — do not rewrite to LAN/USB localhost.
  if (fromEnv && /^https:\/\//i.test(fromEnv)) {
    return fromEnv;
  }

  const expoHost = getExpoDevHost();

  // Wi‑Fi dev client: Metro host is the PC LAN IP — API must use the same host.
  if (__DEV__ && Constants.isDevice && expoHost && !isLoopbackHost(expoHost)) {
    return `http://${expoHost}:${port}`;
  }

  // USB + adb reverse (Metro on localhost / 127.0.0.1).
  if (__DEV__ && Constants.isDevice && expoHost && isLoopbackHost(expoHost)) {
    return `http://127.0.0.1:${port}`;
  }

  if (__DEV__ && Constants.isDevice && fromEnv) {
    return fromEnv;
  }

  if (fromEnv) return fromEnv;

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return `http://10.0.2.2:${port}`;
  }

  return `http://localhost:${port}`;
}
