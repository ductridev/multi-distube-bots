import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'i1.sndcdn.com',
        pathname: '/artworks-/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiUrl}/socket.io/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/socket.io/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'Upgrade',
          },
          {
            key: 'Upgrade',
            value: 'websocket',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
