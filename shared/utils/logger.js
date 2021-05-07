const { join } = require('path');
const winston = require('winston');
const moment = require('moment-timezone');
require('winston-daily-rotate-file');

const { IS_DEV, LOG_LEVEL = 'debug', ROOT_DIR } = require('../env');

const format = winston.format.printf(
  ({ level, message }) => {
    const timestamp = moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    return `[${timestamp}][${level.toUpperCase()}]:::${message}`;
  }
);

module.exports = dir => {
  const transports = [
    new winston.transports.DailyRotateFile({
      filename: join(ROOT_DIR, 'logs', dir, '%DATE%.log'),
      zippedArchive: false,
      format,
      handleExceptions: true,
    })
  ];

  if (IS_DEV)
    transports.push(new winston.transports.Console({ format, handleExceptions: true, colorize: true }));

  const logger = winston.createLogger({
    level: LOG_LEVEL,
    transports
  });

  logger.stream = {
    write(message) {
      logger.info(message);
    }
  };

  return logger;
};
