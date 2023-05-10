const { Router } = require('express');
const { isOperator } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/projects', isOperator, controller.getProjects);
router.get('/projects/download', isOperator, controller.downloadProjects);
// router.get('/projects/statistic', isOperator, controller.getStatistic);
// router.get('/projects', controller.getProjects);
// router.get('/projects/download', controller.downloadProjects);
router.get('/projects/statistic', controller.getStatistic);

module.exports = router;
