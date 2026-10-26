import withPWA from 'next-pwa'

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/display/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // מסכים ועמודי צוות — תמיד הנתונים העדכניים, בלי מטמון
      ...['/orientation/:path*', '/physio', '/staff/:path*', '/view/:path*'].map(source => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      })),
    ]
  },
}

export default pwaConfig(nextConfig)