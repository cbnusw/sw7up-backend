const hasRole = (user, role) => !user ? false : user.roles.indexOf(role) !== -1 || user.roles.indexOf('admin') !== -1;
const hasRoles = (user, ...roles) => !user ? false : roles.length === 0 || !!roles.find(role => hasRole(user, role));

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (hasRole(user, 'admin')) return true;
  if (!hasRole(user, 'operator')) return false;
  if (user.permissions.includes('all')) return true;
  return user.permissions.includes(permission);
};

const hasPermissions = (user, ...permissions) =>
  !user ? false : !!permissions.find(permission => hasPermission(user, permission));

exports.hasRole = hasRole;
exports.hasRoles = hasRoles;
exports.hasPermission = hasPermission;
exports.hasPermissions = hasPermissions;
