import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { resolveDevServiceUrl } from '@/services/devHost';

function usesSameOriginWebSocket(): boolean {
  if (process.env.EXPO_PUBLIC_WEB_SAME_ORIGIN === 'true') return true;
  return Platform.OS === 'web' && !__DEV__;
}

function resolveSocketUrl(): string {
  if (usesSameOriginWebSocket()) {
    return '';
  }
  return resolveDevServiceUrl(process.env.EXPO_PUBLIC_SOCKET_URL, 3002);
}

export function connectSocket(accessToken: string): Socket {
  return io(resolveSocketUrl(), {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
}

export { resolveSocketUrl };
