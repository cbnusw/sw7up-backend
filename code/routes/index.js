const { Router } = require('express');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');
const { debug } = require('../utils/logger');

const router = Router();

readdirSync(__dirname)
  .filter(dir => statSync(join(__dirname, dir)).isDirectory())
  .forEach(dir => {
    debug(`Loading Code APIs: ${dir}`);
    router.use(`/${dir}`, require(join(__dirname, dir)));
  });

module.exports = router;
