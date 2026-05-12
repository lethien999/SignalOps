/** @type {import('next').NextConfig} */
const nextConfig = { eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
