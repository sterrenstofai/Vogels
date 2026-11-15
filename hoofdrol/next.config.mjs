/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', 'pdf-lib', '@pdf-lib/fontkit'],
  outputFileTracingIncludes: { '/api/**': ['./node_modules/@fontsource/baloo-2/files/baloo-2-latin-*-normal.woff'] },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    }];
  },
};
export default nextConfig;
