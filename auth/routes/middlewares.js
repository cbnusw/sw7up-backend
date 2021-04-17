const { verifyAccessToken } = require('../utils/jwt');
const {
  hasRole: _hasRole,
  hasEveryRoles: _hasEveryRoles,
  hasSomeRoles: _hasSomeRoles,
  hasPermission: _hasPermission,
  hasEveryPermissions: _hasEveryPermissions,
  hasSomePermissions: _hasSomePermissions
} = require('../../shared/utils/permission');
const {
  FORBIDDEN,
  TOKEN_REQUIRED
} = require('../../shared/errors');

const isAuthenticated = async (req, res, next) => {
  const token = req.headers['x-access-token'];

  if (token) {
    try {
      req.user = await verifyAccessToken(token);
      return next();
    } catch (e) {
      return next(e);
    }
  }
  return next(TOKEN_REQUIRED);
};

const hasRole = role => [
  isAuthenticated,
  (req, res, next) => _hasRole(req.user, role) ? next() : next(FORBIDDEN)
];

const hasEveryRoles = (...roles) => [
  isAuthenticated,
  (req, res, next) => _hasEveryRoles(req.user, ...roles) ? next() : next(FORBIDDEN)
];

const hasSomeRoles = (...roles) => [
  isAuthenticated,
  (req, res, next) => _hasSomeRoles(req.user, ...roles) ? next() : next(FORBIDDEN)
];

const hasPermission = permission => [
  isAuthenticated,
  (req, res, next) => _hasPermission(req.user, permission) ? next() : next(FORBIDDEN)
];

const hasEveryPermissions = (...permissions) => [
  isAuthenticated,
  (req, res, next) => _hasEveryPermissions(req.user, ...permissions) ? next() : next(FORBIDDEN)
];

const hasSomePermissions = (...permissions) => [
  isAuthenticated,
  (req, res, next) => _hasSomePermissions(req.user, ...permissions) ? next() : next(FORBIDDEN)
];

exports.isAuthenticated = isAuthenticated;
exports.isAdmin = hasRole('admin');
exports.isOperator = hasSomeRoles('admin', 'operator');
exports.isStudent = hasRole('student');
exports.hasRole = hasRole;
exports.hasEveryRoles = hasEveryRoles;
exports.hasSomeRoles = hasSomeRoles;
exports.hasPermission = hasPermission;
exports.hasEveryPermissions = hasEveryPermissions;
exports.hasSomePermissions = hasSomePermissions;
