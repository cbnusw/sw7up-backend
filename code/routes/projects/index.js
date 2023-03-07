const { Router } = require('express');
const { isStudent, isAuthenticated } = require('../../../shared/middlewares/auth');
const controller = require('./controller');
const { createSingleUpload, createArrayUpload } = require('./middlewares');

const router = Router();

router.get('/', controller.getProjects);
router.get('/me', isStudent, controller.getMyProjects);
router.get('/none-source/me', isStudent, controller.getMyNoneSourceProjects);
router.get('/source-code/:id', controller.getProjectSourceCode);
router.get('/documents/:id/download', controller.downloadDocument);
router.get('/:id', controller.getProject);
router.get('/:id/source/download', controller.downloadSourceFiles);

router.post('/', isStudent, controller.createProject);
router.post(
  '/:id/source/*',
  isStudent,
  createSingleUpload('temp-sources', true),
  controller.succssResponse
);
router.post(
  '/:id/banners',
  isStudent,
  createArrayUpload('banners'),
  controller.uploadBanners
);
router.post(
  '/:id/documents',
  isStudent,
  createSingleUpload('documents'),
  controller.addDocument,
);

router.patch('/:id/basic', isAuthenticated, controller.updateBasic);
router.patch('/:id/source/apply-upload', isStudent, controller.applyUploadSourceFiles);
router.patch('/:id/source/clone', isAuthenticated, controller.cloneSourceFiles);
router.patch('/:id/banners/remove', isAuthenticated, controller.removeBanner);
router.patch('/:id/source/remove', isAuthenticated, controller.removeSourceFiles);
router.patch('/:id/banners/video/add', isAuthenticated, controller.addVideoBanner);
router.patch('/:id/team/name', isAuthenticated, controller.updateTeamName);
router.patch('/:id/team/joined/add', isAuthenticated, controller.addJoinedTeamMember);
router.patch('/:id/team/joined/remove', isAuthenticated, controller.removeJoinedTeamMember);
router.patch('/:id/team/github/add', isAuthenticated, controller.addGitHubTeamMembers);
router.patch('/:id/team/github/remove', isAuthenticated, controller.removeGitHubTeamMember);
router.patch('/:id/team/not-joined/add', isAuthenticated, controller.addNotJoinedTeamMember);
router.patch('/:id/team/not-joined/remove', isAuthenticated, controller.removeNotJoinedTeamMember);
router.patch('/:id/oss/add', isAuthenticated, controller.addOss);
router.patch('/:id/oss/remove', isAuthenticated, controller.removeOss);
router.patch('/:id/documents/remove', isAuthenticated, controller.removeDocument);

router.delete('/:id', isAuthenticated, controller.removeProject);
router.delete('/:id/temp-sources', isStudent, controller.removeSourceTempDir);

module.exports = router;
