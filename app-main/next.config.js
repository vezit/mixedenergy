// next.config.js

const isLocal = process.env.NODE_ENV === 'development';

export default {
  images: {
    domains: ['dev-supabase.vezit.net','192.168.5.10', 'mixedenergy.ngrok.dev', 'mixedenergy.dk', 'www.mixedenergy.dk', 'api.supabase.mixedenergy.dk'],
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
