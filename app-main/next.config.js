// next.config.js


export default {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  webpack(config, { dev }) {
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },
  // ...other configurations
};