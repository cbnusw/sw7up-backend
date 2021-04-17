const { Router } = require('express');
const { authenticate, hasPermission } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getPressReleases);
router.get('/:id', authenticate, controller.getPressRelease);
router.post('/', ...hasPermission('press release'), controller.createPressRelease);
router.put('/:id', ...hasPermission('press release'), controller.updatePressRelease);
router.delete('/:id', ...hasPermission('press release'), controller.removePressRelease);

module.exports = router;
