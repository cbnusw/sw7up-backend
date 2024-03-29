const { User, UserInfo } = require('../../shared/models');

const users = [
  // 일반 회원 계정
  {
    no: 'kmahn',
    password: 'asdf',
    role: 'member',
    info: {
      name: '안광모',
      email: 'kmahn@chungbuk.ac.kr',
      phone: '01021210220'
    }
  },
  {
    no: 'yskim',
    password: 'asdf',
    role: 'member',
    info: {
      name: '김윤석',
      email: 'yskim@exam.com',
      phone: '01021210221'
    }
  },
  {
    no: 'hdlim',
    password: 'asdf',
    role: 'member',
    info: {
      name: '임희동',
      email: 'hdlim@exam.com',
      phone: '01021210222'
    }
  },
  {
    no: 'shoh',
    password: 'asdf',
    role: 'member',
    info: {
      name: '오수현',
      email: 'shoh@exam.com',
      phone: '01021210224'
    }
  },
  // 학생 계정
  {
    no: '2020001001',
    password: 'asdf',
    role: 'student',
    info: {
      name: '안광모',
      email: 'akm@test.com',
      phone: '01022223333',
      university: '충북대학교',
      department: '컴퓨터공학과'
    }
  },
  {
    no: '2020001002',
    password: 'asdf',
    role: 'student',
    info: {
      name: '김윤석',
      email: 'kys@test.com',
      phone: '01033334444',
      university: '충북대학교',
      department: '컴퓨터공학과',
    }
  },
  {
    no: '2020001003',
    password: 'asdf',
    role: 'student',
    info: {
      name: '오수현',
      email: 'osh@test.com',
      phone: '01044445555',
      university: '충북대학교',
      department: '컴퓨터공학과'
    }
  },
  {
    no: '2020001004',
    password: 'asdf',
    role: 'student',
    info: {
      name: '임희동',
      email: 'lhd@test.com',
      phone: '01055556666',
      university: '충북대학교',
      department: '컴퓨터공학과'
    }
  },
  {
    no: '2020002001',
    password: 'asdf',
    role: 'student',
    info: {
      name: '이찬혁',
      email: 'lch@test.com',
      phone: '01044445556',
      university: '충북대학교',
      department: '정보통신공학부'
    }
  },
  {
    no: '2020003001',
    password: 'asdf',
    role: 'student',
    info: {
      name: '조희진',
      email: 'jhj@test.com',
      phone: '01044445557',
      university: '충북대학교',
      department: '소프트웨어학과'
    }
  },
  // 교직원 계정
  {
    no: '123451',
    password: 'asdf',
    role: 'operator',
    permissions: [],
    info: {
      name: '홍길동',
      email: 'staff1@test.com',
      phone: '01066667777',
      department: '사업부',
      position: '팀장',
    }
  },
  {
    no: '123461',
    password: 'asdf',
    role: 'operator',
    permissions: [],
    info: {
      name: '임꺽정',
      email: 'staff2@test.com',
      phone: '01077778888',
      department: '영업부',
      position: '팀장',
    }
  },
  {
    no: '111111',
    password: 'asdf',
    role: 'staff',
    permissions: [],
    info: {
      name: '김교수',
      email: 'professor@test.com',
      phone: '01090909090',
      department: '소프트웨어학부',
      position: '교수',
    }
  },
];

const createSeeds = async () => {
  for (let user of users) {
    const { no, password, role, permissions = [], info } = user;
    const exUser = await User.findOne({ no });
    if (!exUser) {
      const u = await User.create({ no, password, role, permissions });
      const { _id } = await UserInfo.create({ no, ...info, role, user: u._id });
      u.info = _id;
      await u.save();
    }
  }
};

module.exports = createSeeds;
