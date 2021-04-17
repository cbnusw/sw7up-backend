const { Router } = require('express');
const { authenticate, hasPermission, isAuthenticated } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getQnAs);
router.get('/:id', authenticate, controller.getQnA);
// router.get('/:id/simple', controller.getSimpleQnA);

router.post('/', authenticate, controller.createQnA);
router.post('/:id', authenticate, controller.getQnA);
router.post('/:id/reply', authenticate, controller.addReply);
router.post('/:id/password', authenticate, controller.checkPassword);

router.put('/:id', authenticate, controller.updateQnA);
router.put('/:id/reply/:replyId', authenticate, controller.updateReply);

router.patch('/:id/confirm', ...hasPermission('qna'), controller.confirm);
router.patch('/:id/reply/:replyId/remove', controller.removeReply);

router.delete('/:id', ...hasPermission('qna'), controller.removeQnA);
router.delete('/:id/reply/:replyId', isAuthenticated, controller.removeReply);

module.exports = router;
