const { Router } = require('express');
const controller = require('./controller');
const { isStudent } = require('../../../shared/middlewares/auth');

const router = Router();

router.get('/count', controller.count);
router.get('/count/me', isStudent, controller.countMe);
router.get('/departments', controller.getDepartments);
router.get('/languages/me', isStudent, controller.getMyLanguages);
router.get('/semesters/me', isStudent, controller.getMySemesters);
router.get('/projects/grades/me', isStudent, controller.getMyProjectsByGrade);

module.exports = router;
