/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Proxy Circle stablecoin kits API to avoid browser CORS restrictions
      {
        source: "/api/circle-proxy/:path*",
        destination: "https://api.circle.com/:path*",
      },
    ];
  },
};

export default nextConfig;
