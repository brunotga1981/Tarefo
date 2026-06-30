/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Permite upload de imagens e vídeos curtos nos Server Actions (padrão é 1 MB).
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;
