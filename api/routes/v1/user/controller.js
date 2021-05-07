const asyncHandler = require('express-async-handler');
const { User, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRole } = require('../../../../shared/utils/permission');
const { removeFileByUrl, updateFiles } = require('../../../../shared/utils/file');
const { sendMail } = require('../../../../shared/services/mail');

const {
  EMAIL_USED,
  FORBIDDEN,
  PHONE_NUMBER_USED,
  REG_NUMBER_USED,
  USER_DELETED,
  USER_DEPARTMENT_REQUIRED,
  USER_EMAIL_REQUIRED,
  USER_INFO_NOT_FOUND,
  USER_NAME_REQUIRED,
  USER_NOT_DELETED,
  USER_NOT_FOUND,
  USER_PHONE_REQUIRED,
} = require('../../../../shared/errors');

const getUsers = role => asyncHandler(async (req, res, next) => {
  const data = await UserInfo.search(req.query, { role });
  res.json(createResponse(res, data));
});

const getUser = role => asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const data = await UserInfo.findById(id).populate({ path: 'user', select: 'permissions' });

  if (!data) return next(USER_INFO_NOT_FOUND);
  if (data.role !== role) return next(FORBIDDEN);

  res.json(createResponse(res, data));
});

const registerUser = (...role) => asyncHandler(async (req, res, next) => {
  const { no, permissions = [], info } = req.body;
  const password = generatePassword();

  if (!info.name) return next(USER_NAME_REQUIRED);
  if (!info.email) return next(USER_EMAIL_REQUIRED);
  if (!info.phone) return next(USER_PHONE_REQUIRED);
  if (!info.department) return next(USER_DEPARTMENT_REQUIRED);

  const { email, phone } = info;
  const [exUser, exNo, exEmail, exPhone] = await Promise.all([
    User.findOne({ no }),
    UserInfo.findOne({ no }),
    UserInfo.findOne({ email }),
    UserInfo.findOne({ phone }),
  ]);

  if (exUser || exNo) return next(REG_NUMBER_USED);
  if (exEmail) return next(EMAIL_USED);
  if (exPhone) return next(PHONE_NUMBER_USED);

  const user = await User.create({ no, password, role, permissions });
  const infoInstance = await UserInfo.create({ no, ...info, role, user: user._id });

  user.info = infoInstance._id;
  await user.save();

  const mailBody = `<p><a href="https://sw7up.cbnu.ac.kr">충북대학교 SW중심대학사업단</a> 회원으로 등록되었습니다.</p>
<p>아래의 계정으로 로그인해주세요.</p>
<p>이메일: ${email}</p>
<p>임시 비밀번호: ${password}</p>
<p style="color: red; font-size: 0.8em">* 로그인 후 비밀번호를 변경해주세요.</p>`

  await sendMail('회원 등록 안내');

  if (info.image) await updateFiles(req, infoInstance._id, 'UserInfo', [info.image]);

  res.json(createResponse(res, infoInstance));
});

const restore = asyncHandler(async (req, res, next) => {
  const { params: { id } } = req;
  const info = await UserInfo.findById(id);

  if (!info) return next(USER_INFO_NOT_FOUND);
  if (info.user) return next(USER_NOT_DELETED);

  const { no, role, email } = info;
  const password = generatePassword();
  const user = await User.create({ no, password, role, permissions: [], info: info._id });

  info.user = user._id;

  const mailBody = `<p>계정을 복구하였습니다. 다음 계정으로 로그인해주세요.</p>
<p>이메일: ${email}</p>
<p>임시 비밀번호: ${password}</p>
<p style="color: red; font-size: 0.8em">* 로그인 후 비밀번호를 변경해주세요.</p>`;

  await Promise.all([info.save(), sendMail('계정 복구', mailBody, email)]);

  res.json(createResponse(res));
});


const updateUser = role => asyncHandler(async (req, res, next) => {
  const { params: { id }, body: $set } = req.params;

  // 변경 불가능한 속성 제거
  delete $set.role;
  delete $set.user;

  const info = await UserInfo.findById(id);
  if (!info) return next(USER_INFO_NOT_FOUND);

  const user = await User.findById(info.user);
  if (!user) return next(USER_NOT_FOUND);

  if (!hasRole(info, role)) return next(FORBIDDEN);

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
  } else if (!image) {
    await removeFileByUrl(req, image);
  }

  await info.updateOne({ $set });

  res.json(createResponse(res));
});

const setPermissions = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: { permissions } } = req;
  const info = await UserInfo.findById(id);

  if (!info) return next(USER_INFO_NOT_FOUND);

  const user = await User.findById(info.user);
  if (!user) return next(USER_NOT_FOUND);

  user.permissions = permissions;
  await user.save();
  res.json(createResponse(res));
});

const changeRole = role => asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const info = await UserInfo.findById(id);

  if (!info) return next(USER_INFO_NOT_FOUND);

  const user = await User.findById(info.user);

  if (!user) return next(USER_NOT_FOUND);

  info.role = role;
  user.role = role;
  await Promise.all([info.save(), user.save()]);

  res.json(createResponse(res));
});

const clear = asyncHandler(async (req, res, next) => {
  await UserInfo.deleteMany({ user: { $exists: false } });
  res.json(createResponse(res));
});

const removeUser = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;

  if (String(user.info) === String(id)) return next(FORBIDDEN);

  const info = await UserInfo.findById(id);

  if (!info) return (USER_INFO_NOT_FOUND);
  if (!info.user) return (USER_DELETED);

  const userInstance = await User.findById(info.user);

  if (userInstance) await userInstance.deleteOne();

  await info.updateOne({ $unset: { user: '' } });

  res.json(createResponse(res));
});

const clearUser = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;

  if (String(user.info) === String(id)) return next(FORBIDDEN);

  const info = await UserInfo.findById(id);
  if (!info) return (USER_INFO_NOT_FOUND);
  if (info.user) {
    const userInstance = await User.findById(info.user);
    if (userInstance) userInstance.deleteOne();
  }
  await info.deleteOne();
  res.json(createResponse(res));
});

function generatePassword() {
  const strings = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_+-='.split('');
  const password = [];
  let passwordLength = 10;
  while (passwordLength > 0) {
    password.push(strings[Math.floor(Math.random() * strings.length)]);
    passwordLength--;
  }
  return password.join('');
}


exports.getMembers = getUsers('member');
exports.getStudents = getUsers('student');
exports.getStaffs = getUsers('staff');
exports.getOperators = getUsers('operator');
exports.getStudent = getUser('student');
exports.getStaff = getUser('staff');
exports.getOperator = getUser('operator');
exports.registerStudent = registerUser('student');
exports.registerStaff = registerUser('staff');
exports.registerOperator = registerUser('operator');
exports.restore = restore;
exports.updateStudent = updateUser('student');
exports.updateStaff = updateUser('staff');
exports.updateOperator = updateUser('operator');
exports.setPermissions = setPermissions;
exports.changeRole = changeRole;
exports.clear = clear;
exports.removeUser = removeUser;
exports.clearUser = clearUser;
