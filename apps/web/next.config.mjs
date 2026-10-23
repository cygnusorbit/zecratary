import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only apply standalone output for production builds, avoiding dev watcher conflicts
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: false,
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
