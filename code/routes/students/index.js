const { Router } = require('express');
const controller = require('./controller');
const { isAuthenticated } = require('../../../shared/middlewares/auth');

const router = Router();

router.get('/me/report', isAuthenticated, controller.getMyReport);
router.get('/me/info', isAuthenticated, controller.getMyStudentInfo);

module.exports = router;
