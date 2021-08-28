module.exports = {
  apps: [
    {
      name: 'whatsapp_gateway',
      script: 'npm run start',
      instances: 1, // max instance = 0 | max
      exec_mode: 'fork',
      watch: false, // default: watch = true
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
