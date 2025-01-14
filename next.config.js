/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Add handling for agora-rtc-react
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    
    // Handle react-quill
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-quill$': 'react-quill/dist/react-quill.js',
      };
    }

    return config;
  },
}

module.exports = nextConfig
