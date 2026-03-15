/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // TensorFlow.js requires canvas in Node environments but we only run inference
    // in the browser, so we tell webpack to skip bundling the native canvas module.
    config.externals = [...(config.externals ?? []), { canvas: "canvas" }];
    return config;
  },
};

module.exports = nextConfig;
