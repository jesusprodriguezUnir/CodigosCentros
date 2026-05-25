/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: false },
  async redirects() {
    return [
      {
        source: "/concursillo",
        destination: "/lista-centros",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
