/**
 * 관련 Github APIs
 *  [Get Code]: 인증 토큰을 얻기 위한 과정
 *   - GET https://github.com/login/oauth/authorize?client_id={발급받은 클라이언트 아이디}, 웹 브라우저에서 실행해야 함
 *
 *  [Get Access Token]: 위에서 발급 받은 코드를 이용하여 액세스 토큰을 얻어옴
 *   - POST https://github.com/login/oauth/access_token
 *   - Body
 *      {
 *        "client_id": {발급받은 클라이언트 아이디},
 *        "client_secret": {발급받은 클라이언트 시크릿},
 *        "code": {위에서 획득한 코드}
 *      }
 *  [Get User]: 위에서 발급받은 액세스 토큰을 이용하여 Github 계정 정보를 얻어옴
 *   - GET https://api.github.com/user
 *   - Headers
 *     Accept: application/vnd.github.v3+json
 *     Authorization: token {위에서 발급받은 액세스 토큰}
 */
const { Router } = require('express');
const { isAuthenticated } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/me', isAuthenticated, controller.getMyGithubAccounts);
router.get('/key', isAuthenticated, controller.getGithubKey);
router.get('/account/:username', isAuthenticated, controller.getGithubAccount);

router.post('/', isAuthenticated, controller.createGithubAccount);

router.delete('/:id', isAuthenticated, controller.removeGithubAccount);

module.exports = router;
