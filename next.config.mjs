/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Permite upload de imagens maiores nos Server Actions (padrão é 1 MB).
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
