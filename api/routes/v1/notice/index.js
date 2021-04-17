const { Router } = require('express');
const { authenticate, isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', authenticate, controller.getNotices);
router.get('/:id', authenticate, controller.getNotice);

router.post('/', ...isOperator, controller.createNotice);

router.put('/:id', ...isOperator, controller.updateNotice);

router.delete('/:id', ...isOperator, controller.removeNotice);

module.exports = router;
