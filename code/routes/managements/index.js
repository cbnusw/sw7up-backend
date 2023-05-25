const { Router } = require('express');
const { isOperator } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/projects', ...isOperator, controller.getProjects);
router.get('/projects/download', ...isOperator, controller.downloadProjects);
router.get('/projects/statistic', controller.getStatistic);

router.get('/students', ...isOperator, controller.getStudents);
router.get('/students/departments', controller.getStudentDepartments);
router.post('/students/register', ...isOperator, controller.registerStudents);
router.delete('/students/clear', ...isOperator, controller.clearStudents);
router.delete('/students/:id', ...isOperator, controller.removeStudent);

router.get('/topcits', ...isOperator, controller.getTopcits);
router.get('/topcits/years', controller.getTopcitYears);
router.get('/topcits/no-list', controller.getTopcitsNoList);
router.get('/topcits/levels', controller.getTopcitLevels);
router.get('/topcits/departments', controller.getTopcitDepartments);
router.get('/topcits/grades', controller.getTopcitGrades);
router.post('/topcits/register', ...isOperator, controller.registerTopcits);
router.delete('/topcits/:id', ...isOperator, controller.removeTopcit);

router.get('/topcit-stats', ...isOperator, controller.getTopcitStats);
router.get('/topcit-stats/categories', controller.getTopcitStatCategories);
router.get('/topcit-stats/years', controller.getTopcitStatYears)
router.get('/topcit-stats/no-list', controller.getTopcitStatNoList);
router.post('/topcit-stats/register', ...isOperator, controller.registerTopcitStats);
router.delete('/topcit-stats/:id', ...isOperator, controller.removeTopcitStat);

router.get('/step-up', ...isOperator, controller.getStepUpData);
router.get('/step-up/departments', controller.getStepUpDapartments);
router.get('/step-up/levels', controller.getStepUpLevels);
router.post('/step-up/register', ...isOperator, controller.registerStepUpData);
router.delete('/step-up/:id', ...isOperator, controller.removeStepUp);

// router.get('/projects/statistic', isOperator, controller.getStatistic);
// router.get('/projects', controller.getProjects);
// router.get('/projects/download', controller.downloadProjects);

module.exports = router;
