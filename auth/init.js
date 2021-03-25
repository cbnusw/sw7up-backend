const {
  ADMIN_NO,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  ADMIN_EMAIL,
  ADMIN_PHONE,
  ADMIN_DEPARTMENT,
} = require('../shared/env');

const { User, UserInfo } = require('../shared/models/@auth');

module.exports = async () => {
  await createAdmin();
};

async function createAdmin() {
  const admin = {
    no: ADMIN_NO,
    password: ADMIN_PASSWORD,
    roles: ['admin'],
    permissions: ['all'],
    info: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      department: ADMIN_DEPARTMENT,
    }
  };

  const count = await User.countDocuments({ roles: 'admin' });

  if (count === 0) {
    const { no, password, roles, permissions, info } = admin;
    const user = await User.create({ no, password, roles, permissions });
    const userInfo = await UserInfo.create({ no, ...info, roles, user: user._id });
    user.info = userInfo._id;
    await user.save();
  }
}
