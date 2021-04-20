const { Router } = require('express');
const { isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getOrganization);
router.put('/', isOperator, controller.updateOrganization);

module.exports = router;
