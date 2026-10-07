import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],

  // Allow LAN devices (phones, tablets) to reach the dev server.
  // "10.197.8.193" is your PC's LAN IP, shown in the dev server banner.
  // Adjust if your machine's IP changes. See:
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ['10.197.8.193', '10.*.*.*', '192.168.*.*'],
};

export default nextConfig;