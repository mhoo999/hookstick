/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'outofline.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'm.crispywave.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'crispywave.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'm.homie-bear.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'homie-bear.co.kr',
      },
    ],
  },
}

module.exports = nextConfig 