/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Yahoo Finance endpoints are unofficial and rate-limited.
  // We proxy through our own API routes (lib/data) so the client never
  // calls Yahoo directly, and so we can swap providers later.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=15, stale-while-revalidate=30' },
        ],
      },
    ];
  },
};

export default nextConfig;
