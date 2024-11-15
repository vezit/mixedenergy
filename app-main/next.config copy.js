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
  functions: {
    'api/cron/deleteOldSessions': {
      memory: 256,
      maxDuration: 60,
    }
  }
};
