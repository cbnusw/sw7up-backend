const { Router } = require('express');
const controller = require('./controller');
const { isAuthenticated } = require('../../../shared/middlewares/auth');
const { accessible, noToId } = require('./middlewares');

const router = Router();

// response: 학과별, 기간별(연도/학기), 학년별, 프로젝트를 등록한 학생수
// query: 연도
router.get('/projects', controller.getProjects);

// query: 연도
router.get('/languages', controller.getLanguages);

router.get('/rankings', controller.getRankings);

// query: 회차
router.get('/topcit-stats/:no', controller.getTopcitStats);

// response: 등록한 총 프로젝트 수, 기간별, 학년별 (각 데이터에 대한 평균)
// query: 연도
router.get(
  '/:no/projects',
  isAuthenticated,
  accessible,
  noToId,
  controller.getStudentProjects
);

router.get(
  '/:no/projects/years',
  isAuthenticated,
  accessible,
  noToId,
  controller.getStudentProjectYears
);

router.get(
  '/:no/languages',
  isAuthenticated,
  accessible,
  noToId,
  controller.getStudentLanguages
);

router.get(
  '/:no/topcits',
  isAuthenticated,
  accessible,
  controller.getStudentTopcits
);

router.get(
  '/:no/step-ups',
  isAuthenticated,
  accessible,
  controller.getStudentStepUps
);

router.get(
  '/me/coding-level',
  isAuthenticated,
  controller.getMyCodingLevel,
);

router.get(
  '/:no/coding-level',
  accessible,
  noToId,
  controller.getCodingLevel,
);

module.exports = router;
