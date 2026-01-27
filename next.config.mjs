/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true
  },
  images: {
    // Allow these hosts for next/image (protocol-agnostic via domains)
    domains: [
      "images.unsplash.com",
      "via.placeholder.com",
      "ticketlybackend-production.up.railway.app"
    ],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "ticketlybackend-production.up.railway.app" },
      { protocol: "http", hostname: "ticketlybackend-production.up.railway.app" }
    ]
  }
};

export default nextConfig;


