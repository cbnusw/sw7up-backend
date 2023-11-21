const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const { IS_DEV, WHITELIST } = require('../env');

const whitelist = WHITELIST.split(',');
console.log(whitelist);

module.exports = (app, staticOptions) => {
  const logDir = app.get('logDir');
  const { stream } = require('../utils/logger')(logDir);

  app.use(helmet());
  app.use(compression());

  app.use(morgan(IS_DEV ? 'dev' : 'combined', { stream }));
  app.use(cors({
    origin(origin, callback) {
      console.log(origin);
      if (whitelist.indexOf(origin) !== -1) return callback(null, true);
      else callback(new Error('Not Allowed Origin'));
    }
  }));
  if (staticOptions) staticOptions.forEach(options => app.use(...options));
  app.use(express.json({limit: '50mb'}));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1;mode=block');
    next();
  });
};
