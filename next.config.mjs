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
      // תמונות הפעילויות, המנות והארוחות: הטלוויזיה שומרת אותן אצלה ליום שלם.
      // בלי זה היא בודקת מול השרת כל תמונה בכל החלפת תצוגה (מאות אלפי בקשות ביום מכל המסכים),
      // וכשהרשת נופלת לרגע — התמונות נעלמות מהלוח.
      {
        source: '/:folder(activities|dishes|meals)/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      // ה-service worker של המסכים: תמיד הגרסה העדכנית
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
