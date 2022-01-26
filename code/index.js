const http = require('http');
const app = require('./app');
const { debug, error } = require('./utils/logger');
const { CODE_APP_PORT: PORT, IS_DEV } = require('../shared/env');
const runSchedulers = require('./schedulers');

const server = http.createServer(app);

server.listen(+PORT);
server.on('error', error);
server.on('listening', () => {
  const addr = server.address();
  debug(`Server running on ${addr.address}${addr.port}`);
});

runSchedulers();
