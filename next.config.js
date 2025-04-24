/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'outofline.co.kr',
      },
    ],
  },
}

module.exports = nextConfig 