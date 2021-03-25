const { User, UserInfo } = require('../../shared/models');

const users = [
  // 학생 계정
  {
    no: '20200010001',
    password: 'asdf',
    roles: ['student'],
    info: {
      name: '안광모',
      email: 'akm@test.com',
      phone: '01022223333',
      department: '컴퓨터공학과'
    }
  },
  {
    no: '20200010002',
    password: 'asdf',
    roles: ['student'],
    info: {
      name: '김윤석',
      email: 'kys@test.com',
      phone: '01033334444',
      department: '컴퓨터공학과'
    }
  },
  {
    no: '20200010003',
    password: 'asdf',
    roles: ['student'],
    info: {
      name: '오수현',
      email: 'osh@test.com',
      phone: '01044445555',
      department: '컴퓨터공학과'
    }
  },
  {
    no: '20200010004',
    password: 'asdf',
    roles: ['student'],
    info: {
      name: '임희동',
      email: 'lhd@test.com',
      phone: '01055556666',
      department: '컴퓨터공학과'
    }
  },

  // 교직원 계정
  {
    no: '12345',
    password: 'asdf',
    roles: ['operator'],
    permissions: ['student', 'notice'],
    info: {
      name: '홍길동',
      email: 'staff1@test.com',
      phone: '01066667777',
      department: '사업부',
      position: '팀장',
    }
  },
  {
    no: '12346',
    password: 'asdf',
    roles: ['operator'],
    permissions: ['qna'],
    info: {
      name: '임꺽정',
      email: 'staff2@test.com',
      phone: '01077778888',
      department: '영업부',
      position: '팀장',
    }
  },
];

const createSeeds = async () => {
  for (let user of users) {
    const { no, password, roles, permissions = [], info } = user;
    const exUser = await User.findOne({ no });
    if (!exUser) {
      const u = await User.create({ no, password, roles, permissions });
      const { _id } = await UserInfo.create({ no, ...info, roles, user: u._id });
      u.info = _id;
      await u.save();
    }
  }
};

module.exports = createSeeds;
