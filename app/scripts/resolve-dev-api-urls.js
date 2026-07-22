const API_PORT = 3001;
const SOCKET_PORT = 3002;

function isRemoteUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}

/** Local Metro dev: LAN/USB by default, or Railway when EXPO_PUBLIC_API_URL is https. */
function resolveDevApiUrls(lanIp) {
  const envApi = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  const envSocket = process.env.EXPO_PUBLIC_SOCKET_URL?.trim().replace(/\/$/, '');

  if (envApi && isRemoteUrl(envApi)) {
    return {
      apiUrl: envApi,
      socketUrl: envSocket && isRemoteUrl(envSocket) ? envSocket : envApi,
      mode: 'remote',
    };
  }

  const host = lanIp || '127.0.0.1';
  return {
    apiUrl: envApi || `http://${host}:${API_PORT}`,
    socketUrl: envSocket || `http://${host}:${SOCKET_PORT}`,
    mode: lanIp ? 'lan' : 'localhost',
  };
}

module.exports = { resolveDevApiUrls, API_PORT, SOCKET_PORT };
