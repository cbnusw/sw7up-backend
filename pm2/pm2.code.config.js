require('dotenv').config()

const {
  PM2_CODE_APP_INSTANCE: INSTANCE,
  PM2_CODE_APP_EXEC_MODE: EXEC_MODE,
} = process.env;

const instance = +(INSTANCE || 1);
const execMode = EXEC_MODE || undefined;

module.exports = require('./pm2')('code-app', 'code/index.js', instance, execMode);
