/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // TensorFlow.js requires canvas in Node environments but we only run inference
    // in the browser, so we tell webpack to skip bundling the native canvas module.
    config.externals = [...(config.externals ?? []), { canvas: "canvas" }];
    return config;
  },
  turbopack: {
    // Turbopack configuration for Next.js 16+ (uses Turbopack by default)
  },
};

module.exports = nextConfig;
