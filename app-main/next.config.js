// next.config.js

const isLocal = process.env.NODE_ENV === 'development';

export default {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    domains: ['192.168.5.10'],
  },
  // webpack(config, { dev }) {
  //   if (dev) {
  //     config.devtool = 'cheap-module-source-map';
  //   }
  //   return config;
  // },
  ...(isLocal
    ? {} // Local environment: no additional configuration
    : {
        functions: {
          'api/cron/deleteOldSessions': {
            memory: 256,
            maxDuration: 60,
          },
        },
      }),
};
