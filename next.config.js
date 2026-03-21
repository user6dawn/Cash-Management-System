/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules[\\/]@supabase[\\/]realtime-js[\\/]dist[\\/]main[\\/]RealtimeClient\.js$/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ]

    return config
  },
};

module.exports = nextConfig;
