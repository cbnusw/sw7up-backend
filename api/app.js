const express = require('express');
const { API_APP_LOG_DIR: LOG_DIR } = require('../shared/env');
const middleware = require('../shared/middlewares/common');
const { notFound, errorHandler } = require('../shared/errors/handlers');
const { error } = require('./utils/logger');
const router = require('./routes');

const app = express();

app.set('logDir', LOG_DIR);
app.disable('x-powered-by');
middleware(app);
app.use(router);
app.use(notFound);
app.use(errorHandler(error));

module.exports = app;
