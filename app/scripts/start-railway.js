/**
 * Dev against production Railway API (no local backend required).
 * Usage: npm run start:railway
 */
process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://sarh-app.up.railway.app';
process.env.EXPO_PUBLIC_SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || 'https://sarh-app.up.railway.app';

require('./start-qr');
