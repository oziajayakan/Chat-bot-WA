/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Penting untuk Railway - build lebih kecil
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
  }
};

module.exports = nextConfig;
