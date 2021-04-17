const { Router } = require('express');
const { authenticate, isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getPressReleases);
router.get('/:id', authenticate, controller.getPressRelease);
router.post('/', ...isOperator, controller.createPressRelease);
router.put('/:id', ...isOperator, controller.updatePressRelease);
router.delete('/:id', ...isOperator, controller.removePressRelease);

module.exports = router;
