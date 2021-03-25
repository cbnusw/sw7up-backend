const { Router } = require('express');
const { authenticate, hasPermission } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', authenticate, controller.getNotices);
router.get('/:id', authenticate, controller.getNotice);

router.post('/', ...hasPermission('notice'), controller.createNotice);

router.put('/:id', ...hasPermission('notice'), controller.updateNotice);

router.delete('/:id', ...hasPermission('notice'), controller.removeNotice);

module.exports = router;
