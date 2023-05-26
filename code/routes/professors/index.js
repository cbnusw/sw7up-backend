const { Router } = require('express');
const { isStaff } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/students', ...isStaff, controller.getStudents);
router.get('/students/:no/topcits', ...isStaff, controller.getTopcitsOfStudent);
router.get('/students/:no/languages', ...isStaff, controller.getLanguagesOfStudent);

module.exports = router;
