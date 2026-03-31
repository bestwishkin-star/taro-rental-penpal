/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rental-penpal/shared'],
  experimental: {
    // 图片上传最大 10MB
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

export default nextConfig;
