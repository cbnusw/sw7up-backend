require('dotenv').config()

const {
  PM2_API_APP_INSTANCE: INSTANCE,
  PM2_API_APP_EXEC_MODE: EXEC_MODE,
} = process.env;

const instance = +(INSTANCE || 1);
const execMode = EXEC_MODE || undefined;

module.exports = require('./pm2')('api-app', 'api/index.js', instance, execMode);
