/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tiktok-live-connector'],
  },
  reactStrictMode: false,
};

export default nextConfig;
