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
      ADMIN_USER: 'ratmas',
      ADMIN_PASS: 'laoshuren',
      ADMIN_SECRET: '3505159e162e582ae86f4c556d00ab6837d651254797d6d1d4898e02f9ddcbc6',
      USER_SECRET: '4dd1ff3b17094fc7feb9d56b215aab704e2f9b4526807e5e43677bc057c6bd07',
      SMS_ACCESS_KEY_ID: '',
      SMS_ACCESS_KEY_SECRET: '',
      SMS_SIGN_NAME: '',
      SMS_TEMPLATE_CODE: '',
      WX_APPID: 'wx55caf10db8f623c7',
      WX_APPSECRET: '58a15f6972d29e0eba9ef031f64a73d0'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/opt/wxcompany/logs/error.log',
    out_file: '/opt/wxcompany/logs/out.log',
    merge_logs: true
  }]
}
