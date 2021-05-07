const hasRole = (user, role) => !!(user && user.role === role);

const hasRoles = (user, ...roles) => !!(user && roles.some(role => role === user.role));

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (hasRoles(user, 'admin', 'operator')) return true;
  if (user.permissions.includes('all')) return true;
  return user.permissions.includes(permission);
};

const hasSomePermissions = (user, ...permissions) =>
  !user ? false : permissions.some(permission => hasPermission(user, permission));

const hasEveryPermissions = (user, ...permissions) =>
  !user ? false : permissions.every(permission => hasPermission(user, permission));

exports.hasRole = hasRole;
exports.hasRoles = hasRoles;
exports.hasPermission = hasPermission;
exports.hasSomePermissions = hasSomePermissions;
exports.hasEveryPermissions = hasEveryPermissions;
