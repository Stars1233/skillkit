import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  assetPrefix: 'https://skillkit-docs.vercel.app',
  async headers() {
    return [
      {
        source: '/:path*.(css|js|png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/docs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default withMDX(config);
