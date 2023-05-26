const asyncHandler = require('express-async-handler');
const { Student, UserInfo } = require('../../../shared/models');
const { FORBIDDEN, LOGIN_REQUIRED, USER_INFO_NOT_FOUND } = require('../../../shared/errors');
const { OPERATOR_ROLES } = require('../../../shared/constants');

const accessible = async (req, res, next) => {
  const { params: { no }, userNo, user } = req;
  
  if (!user) return next(LOGIN_REQUIRED);
  if (user.role === 'student') {
    if (no !== userNo) return next(FORBIDDEN);
  } else if (user.role === 'staff') {
    const student = await Student.findOne({ no }).populate({ path: 'professor', select: 'no' });
    if (!student || student.professor?.no !== userNo) return next(FORBIDDEN);
  } else if (!OPERATOR_ROLES.includes(user.role)) {
    next(FORBIDDEN);
  }
  
  next();
};

const noToId = async (req, res, next) => {
  const { params: { no } } = req;
  const { _id } = await UserInfo.findOne({ no }).lean() || {};
  
  if (!_id) return next(USER_INFO_NOT_FOUND);
  
  req.studentId = _id;
  next();
};

exports.accessible = asyncHandler(accessible);
exports.noToId = asyncHandler(noToId);
