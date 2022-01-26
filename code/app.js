const express = require('express');
const { join } = require('path');
const { CODE_APP_LOG_DIR: LOG_DIR, ROOT_DIR } = require('../shared/env');
const middleware = require('../shared/middlewares/common');
const { notFound, errorHandler } = require('../shared/errors/handlers');
const { error } = require('./utils/logger');
const router = require('./routes');

const app = express();

app.set('logDir', LOG_DIR);
middleware(app);
app.get('/code/static/*', express.static(join(ROOT_DIR, 'code-uploads')));
app.use(router);
app.use(notFound);
app.use(errorHandler(error));

module.exports = app;
