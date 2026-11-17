/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    loader: 'custom',
    loaderFile: './cloudflare-image-loader.js',
  },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;