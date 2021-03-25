const { verifyAccessToken } = require('../utils/jwt');
const {
  hasRole: _hasRole,
  hasRoles: _hasRoles,
  hasPermission: _hasPermission,
  hasPermissions: _hasPermissions
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

const hasRoles = (...roles) => [
  isAuthenticated,
  (req, res, next) => _hasRoles(req.user, ...roles) ? next() : next(FORBIDDEN)
];

const hasPermission = permission => [
  isAuthenticated,
  (req, res, next) => _hasPermission(req.user, permission) ? next() : next(FORBIDDEN)
];

const hasPermissions = (...permissions) => [
  isAuthenticated,
  (req, res, next) => _hasPermissions(req.user, ...permissions) ? next() : next(FORBIDDEN)
];

exports.isAuthenticated = isAuthenticated;
exports.isAdmin = hasRole('admin');
exports.isOperator = hasRoles('admin', 'operator');
exports.isStudent = hasRole('student');
exports.hasPermission = hasPermission;
exports.hasPermissions = hasPermissions;
