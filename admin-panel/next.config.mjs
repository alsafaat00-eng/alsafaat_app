/** @type {import('next').NextConfig} */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
// Guard: proxy must target backend (:3001), never the admin dev server (:3000)
const apiUrl = rawApiUrl.includes(':3000')
  ? 'http://localhost:3001'
  : rawApiUrl.replace(/\/$/, '');

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
