module.exports = {
  apps: [{
    name: 'wxcompany',
    script: './server.js',
    cwd: '/opt/wxcompany/server',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      ADMIN_SECRET: ''
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/opt/wxcompany/logs/error.log',
    out_file: '/opt/wxcompany/logs/out.log',
    merge_logs: true
  }]
}
