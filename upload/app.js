const express = require('express');
const asyncHandler = require('express-async-handler');
const { join } = require('path');
const middleware = require('../shared/middlewares/common');
const { notFound, errorHandler } = require('../shared/errors/handlers');
const { authenticate } = require('../shared/middlewares/auth');
const { hasRoles } = require('../shared/utils/permission');
const { error } = require('./utils/logger');
const { File } = require('../shared/models/@main');
const router = require('./routes');
const {
  ROOT_DIR,
  UPLOAD_APP_LOG_DIR: LOG_DIR,
  UPLOAD_APP_HOST: HOST,
  UPLOAD_DIR,
} = require('../shared/env');
const {
  FORBIDDEN,
} = require('../shared/errors');

const app = express();

app.set('logDir', LOG_DIR);
middleware(app, [
  [
    '/',
    authenticate,
    asyncHandler(async (req, res, next) => {
      const { user } = req;
      const url = `${HOST}${req.originalUrl}`;
      const file = await File.findOne({ url });
      if (!file) return next();
      if (file.access.length > 0 && !hasRoles(user, ...file.access)) return next(FORBIDDEN);
      next();
    }),
    express.static(join(ROOT_DIR, UPLOAD_DIR))
  ]
]);
app.use(router);
app.use(notFound);
app.use(errorHandler(error));

module.exports = app;
