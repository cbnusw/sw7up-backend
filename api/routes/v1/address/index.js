const { Router } = require('express');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getAddresses);
router.get('/coords', controller.getCoordinates);

module.exports = router;
