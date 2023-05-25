const { Router } = require('express');
const { isStaff } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/students', ...isStaff, controller.getStudents);

module.exports = router;
