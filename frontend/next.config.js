/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
  },
  // Untuk handle folder public saat standalone
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*']
    }
  }
};

module.exports = nextConfig;
