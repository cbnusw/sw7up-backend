const hasRole = (user, role) =>
  !user ? false : user.roles.includes(role);

const hasSomeRoles = (user, ...roles) =>
  !user ? false : !!roles.some(role => user.roles.include(role));

const hasEveryRoles = (user, ...roles) =>
  !user ? false : !!roles.every(role => user.roles.includes(role));

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (hasSomeRoles(user, 'admin', 'operator')) return true;
  if (user.permissions.includes('all')) return true;
  return user.permissions.includes(permission);
};

const hasSomePermissions = (user, ...permissions) =>
  !user ? false : permissions.some(permission => hasPermission(user, permission));

const hasEveryPermissions = (user, ...permissions) =>
  !user ? false : permissions.every(permission => hasPermission(user, permission));

exports.hasRole = hasRole;
exports.hasSomeRoles = hasSomeRoles;
exports.hasEveryRoles = hasEveryRoles;
exports.hasPermission = hasPermission;
exports.hasSomePermissions = hasSomePermissions;
exports.hasEveryPermissions = hasEveryPermissions;
