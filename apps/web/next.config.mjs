import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cap worker CPU allocation to 2 to prevent Hostinger CloudLinux CageFS thread exhaustion (os error 11)
process.env.NEXT_CPU_COUNT = process.env.NEXT_CPU_COUNT || '2';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: false,
  // Throttles worker spawning during static page data collection
  experimental: {
    cpus: 2,
    workerThreads: false,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/context': path.resolve(__dirname, 'src/components'),
      '@/contexts': path.resolve(__dirname, 'src/components'),
    };
    return config;
  },
};

export default nextConfig;
