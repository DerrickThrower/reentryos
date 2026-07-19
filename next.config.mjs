/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['twilio', 'googleapis', '@openai/agents'],
  },
};

export default nextConfig;
