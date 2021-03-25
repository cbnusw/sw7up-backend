const { Router } = require('express');
const { isAuthenticated } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', isAuthenticated, controller.getCorruptionReports);
router.get('/:id', isAuthenticated, controller.getCorruptionReport);
router.post('/', isAuthenticated, controller.createCorruptionReport);
router.post('/:id/reply', isAuthenticated, controller.addReply);
router.put('/:id', isAuthenticated, controller.updateCorruptionReport);
router.put('/:id/reply/:replyId', isAuthenticated, controller.updateReply);
router.delete('/:id', isAuthenticated, controller.removeCorruptionReport);
router.delete('/:id/reply/:replyId', isAuthenticated, controller.removeReply);

module.exports = router;
