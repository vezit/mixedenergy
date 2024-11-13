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
  // Function configuration
  functions: {
    // Key is the API route path relative to the 'pages' directory
    'api/cron/deleteOldSessions': {
      memory: 256,
      maxDuration: 60,
    },
  },
  // ...other configurations
};
