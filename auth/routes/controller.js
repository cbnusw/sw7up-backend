const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { Otp, RefreshToken, User, UserInfo } = require('../../shared/models/@auth');
const { createResponse } = require('../../shared/utils/response');
const { updateFiles, removeFileByUrl } = require('../../shared/utils/file');
const { sendMail } = require('../../shared/services/mail');
const { hasSomeRoles } = require('../../shared/utils/permission');
const {
  EMAIL_USED,
  FORBIDDEN,
  INVALID_OTP,
  INVALID_PASSWORD,
  PASSWORD_REQUIRED,
  PHONE_NUMBER_USED,
  REG_NUMBER_REQUIRED,
  REG_NUMBER_USED,
  TOKEN_REQUIRED,
  USER_DEPARTMENT_REQUIRED,
  USER_EMAIL_REQUIRED,
  USER_INFO_NOT_MATCHED,
  USER_INFO_REQUIRED,
  USER_NAME_REQUIRED,
  USER_PHONE_REQUIRED,
  USER_INFO_NOT_FOUND,
  USER_NOT_FOUND
} = require('../../shared/errors');

const getMe = async (req, res, next) => {
  const { user } = req;
  try {
    const doc = await User.findById(user._id)
      .select('-hashedPassword')
      .populate('info');
    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const logout = async (req, res, next) => {
  const token = req.headers['x-refresh-token'];

  try {
    const id = await verifyRefreshToken(token);
    await RefreshToken.removeToken(id, token);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const validateAccessToken = (req, res) => {
  res.json(createResponse(res, req.user));
};

const refreshToken = async (req, res, next) => {
  const oldToken = req.headers['x-refresh-token'];

  if (!oldToken) return next(TOKEN_REQUIRED);

  try {
    const id = await verifyRefreshToken(oldToken);
    const user = await User.findById(id);
    const accessToken = await signAccessToken(user.profile);
    const refreshToken = await signRefreshToken(id);
    await RefreshToken.updateToken(id, refreshToken, oldToken);
    res.json(createResponse(res, { accessToken, refreshToken }));
  } catch (e) {
    next(e);
  }
};

const join = (...roleList) => async (req, res, next) => {
  req.body.roles = req.body.roles || [];
  const { no, password, info, roles } = req.body;

  if (roles.length === 0) roles.push(roleList[0] || 'student');
  if (roles.filter(r => !roleList.includes(r)).length > 0) return next(FORBIDDEN);

  if (!no) return next(REG_NUMBER_REQUIRED);
  if (!password) return next(PASSWORD_REQUIRED);
  if (!info) return next(USER_INFO_REQUIRED);
  if (!info.name) return next(USER_NAME_REQUIRED);
  if (!info.email) return next(USER_EMAIL_REQUIRED);
  if (!info.phone) return next(USER_PHONE_REQUIRED);
  if (!info.department) return next(USER_DEPARTMENT_REQUIRED);

  info.email = info.email.toLowerCase();
  const { email, phone } = info;

  try {
    const [exUser, exNo, exEmail, exPhone] = await Promise.all([
      User.findOne({ no }),
      UserInfo.findOne({ no }),
      UserInfo.findOne({ email }),
      UserInfo.findOne({ phone })
    ]);

    if (exUser || exNo) return next(REG_NUMBER_USED);
    if (exEmail) return next(EMAIL_USED);
    if (exPhone) return next(PHONE_NUMBER_USED);

    const user = await User.create({ no, password, roles, permissions: [] });
    const { _id: infoId } = await UserInfo.create({ no, ...info, roles, user: user._id });
    user.info = infoId;
    await user.save();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const login = (...roles) => async (req, res, next) => {
  const { no, password } = req.body;

  if (!no) return next(REG_NUMBER_REQUIRED);
  if (!password) return next(PASSWORD_REQUIRED);

  try {
    const exUser = await User.findOne({ no });
    if (!exUser) return next(USER_NOT_FOUND);
    if (roles.length !== 0 && !hasSomeRoles(exUser, ...roles)) return next(FORBIDDEN);
    if (!exUser.authenticate(password)) return next(INVALID_PASSWORD);

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(exUser.profile), signRefreshToken(exUser._id)
    ]);
    await RefreshToken.updateToken(exUser._id, refreshToken);

    res.json(createResponse(res, { accessToken, refreshToken }));
  } catch (e) {
    next(e);
  }
};

const sendOtp = async (req, res, next) => {
  const { no, name, email } = req.body;

  try {
    // no and email / name and email
    const user = await getUserInfo({ no, name, email });

    const otp = await Otp.getOtp(user._id);
    const msgBody = `<p>다음 인증번호를 입력해주세요.</p><p>인증번호: [<span style="color: blue;">${otp.code}]</span></p>`;
    await sendMail('인증 번호 전송', msgBody, email);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const checkOtp = async (req, res, next) => {
  const { name, email, code } = req.body;

  try {
    const user = await getUserInfo({ name, email });
    await validateOtp(user._id, code);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const initPassword = async (req, res, next) => {
  const { name, email, code, password } = req.body;

  try {
    const userInfo = await getUserInfo({ name, email });
    await validateOtp(userInfo._id, code);
    const user = await User.findById(userInfo.user);
    if (!user) return next(USER_NOT_FOUND);
    user.password = password;
    await user.save();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const updateMe = async (req, res, next) => {
  const { body: $set, user } = req;

  // todo: 업데이트 불가능한 속성 제거
  delete $set.user;
  delete $set.roles;

  try {
    const info = await UserInfo.findById(user.info);
    if (!info) return next(USER_INFO_NOT_FOUND);

    const user = await User.findById(info.user);
    if (!user) return next(USER_NOT_FOUND);

    const { no, email, phone, image } = $set;

    if (email && email.toLowerCase() !== info.email) {
      const exEmail = await UserInfo.findOne({ email });
      if (exEmail) return next(EMAIL_USED);
    }

    if (phone && phone !== info.phone) {
      const exPhone = await UserInfo.findOne({ phone });
      if (exPhone) return next(PHONE_NUMBER_USED);
    }

    if (no && no !== info.no) {
      const [exUser, exNo] = await Promise.all([
        User.findOne({ no }),
        UserInfo.findOne({ no })
      ]);
      if (exUser || exNo) return next(REG_NUMBER_USED);
      user.no = no;
      await user.save();
    }

    if (image && image !== info.image) {
      await updateFiles(req, info._id, 'UserInfo', [image]);
    } else {
      await removeFileByUrl(req, image);
    }

    await info.updateOne({ $set });
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user.authenticate(oldPassword)) return next(INVALID_PASSWORD);
    user.password = newPassword;
    await user.save()
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

async function getUserInfo({ no, name, email }) {
  const user = no ? await UserInfo.findOne({ no }) : await UserInfo.findOne({ name, email });
  if (user.email !== email) throw USER_INFO_NOT_MATCHED;
  if (!user) throw USER_INFO_NOT_FOUND;
  return user;
}

async function validateOtp(infoId, code) {
  const otp = await Otp.findByUserInfoId(infoId);
  if (!otp || otp.code !== code) throw INVALID_OTP;
}

exports.getMe = getMe;
exports.logout = logout;
exports.validateAccessToken = validateAccessToken;
exports.refreshToken = refreshToken;
exports.join = join('student', 'staff');
exports.joinStudent = join('student');
exports.joinStaff = join('staff');
exports.login = login();
exports.loginOperator = login('admin', 'operator');
exports.sendOtp = sendOtp;
exports.checkOtp = checkOtp;
exports.initPassword = initPassword;
exports.updateMe = updateMe;
exports.changePassword = changePassword;
