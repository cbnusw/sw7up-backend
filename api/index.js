const http = require('http');
const app = require('./app');
const { debug, error } = require('./utils/logger');
const { API_APP_PORT: PORT, IS_DEV } = require('../shared/env');

const server = http.createServer(app);

server.listen(+PORT);
server.on('error', error);
server.on('listening', () => {
  const addr = server.address();
  debug(`Server running on ${addr.address}${addr.port}`);
});

if (IS_DEV) {
  require('./seeds')().then(() => debug(`create seed data`));
}
