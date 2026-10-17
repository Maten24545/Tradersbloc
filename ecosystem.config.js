/**
 * PM2 ecosystem config — production process manager
 * Usage:
 *   npm install -g pm2
 *   cd server && npm install
 *   pm2 start ../ecosystem.config.js
 *   pm2 save && pm2 startup
 */

module.exports = {
  apps: [
    {
      name:        'Tradersbloc',
      script:      './server/server.js',
      cwd:         __dirname,
      instances:   'max',          // use all CPU cores
      exec_mode:   'cluster',
      watch:       false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT:     3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
      error_file:  './server/data/logs/pm2-error.log',
      out_file:    './server/data/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
