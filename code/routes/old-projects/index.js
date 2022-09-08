/**
 * 관련 Github APIs
 *  [Get a Repo]: 리파지터리 정보 가져오기
 *   - GET https://api.github.com/repos/{owner}/{repo}
 *   - Headers
 *     Accept: application/vnd.github.v3+json
 *  [Get commits]: 특정 리파지터리에 대한 커밋 정보 가져오기
 *   - GET https://api.github.com/repos/{owner}/{repo}/commits?per_page=100&page=1
 *   - Headers
 *     Accept: application/vnd.github.v3+json
 *  [Get My Repos]: 내 리파지터리 정보 가져오기(공개된 리파지터리만)
 *   - GET https://api.github.com/user/repos?per_page=100&page=1&type=public
 *   - Headers
 *     Accept: application/vnd.github.v3+json
 *     Authorization: token {위에서 발급받은 액세스 토큰}
 */

const { Router } = require('express');
const { isAuthenticated, isOperator } = require('../../../shared/middlewares/auth');
const controller = require('./controller');
const { createProjectFileUpload, createProjectFileResponse } = require('./middlewares');

const router = Router();

router.get('/', controller.search);
router.get('/count', controller.countProjects);
router.get('/count', controller.countProjectsByDepartment);
router.get('/meta/count', controller.countProjectMetaInfo);
router.get('/meta/count/department', controller.countProjectMetaInfoByDepartment);
router.get('/meta/count/grade-semester', controller.countProjectMetaInfoByGradeAndSemester);
router.get('/me', isAuthenticated, controller.searchMyProjects);
router.get('/me/count', isAuthenticated, controller.countMyProjects);
router.get('/me/meta/count', isAuthenticated, controller.countMyProjectMetaInfo);
router.get('/me/meta/count/grade-semester', isAuthenticated, controller.countMyProjectMetaInfoByGradeAndSemester);
router.get('/github/:accountId', isAuthenticated, controller.getGithubProjects);
router.get('/:id', controller.getProject);
router.get('/:id/download', controller.downloadProject);
router.get('/:id/source', controller.getProjectCodeText);

router.post('/', isAuthenticated, controller.createProject);
router.post('/:id/clone', isAuthenticated, controller.clonePublicProject);
router.post('/id', isAuthenticated, controller.createProjectId);
router.put('/:id', isAuthenticated, controller.updateProject);

router.patch('/:id/approve', ...isOperator, controller.approve);

router.post(
  '/:id/banners',
  isAuthenticated,
  createProjectFileUpload('banners', false),
  createProjectFileResponse('banners')
);

router.post(
  '/:id/documents',
  isAuthenticated,
  createProjectFileUpload('documents', false),
  createProjectFileResponse('documents')
);

router.post(
  '/:id/sources/*',
  isAuthenticated,
  createProjectFileUpload('temp-sources'),
  createProjectFileResponse('temp-sources')
);

router.delete('/:id', isAuthenticated, controller.removeProject);
router.delete('/:id/temp-sources', isAuthenticated, controller.removeTemporarySources);

module.exports = router;
