module.exports = {
  apps: [
    {
      name:         'microfinance-api',
      script:       'server.js',
      cwd:          '/var/www/microfinance/server',
      instances:    'max',
      exec_mode:    'cluster',
      watch:        false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT:     5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
      },
      error_file:  '/var/log/microfinance/err.log',
      out_file:    '/var/log/microfinance/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
    },
  ],
};
