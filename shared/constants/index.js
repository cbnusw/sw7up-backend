const operatorRoles = [
  'admin',
  'operator',
];

const notOperatorRoles = [
  'staff',    // 교직원(충북대 소속만)
  'student',  // 학생(충북대 소속만)
  'member',   // 충북대 소속 외 회원
];

const access = [
  'operator',   // 운영자
  ...notOperatorRoles,
  'nonmember'
];

const roles = [
  ...operatorRoles,
  ...notOperatorRoles,
];

// 운영자가 아닌 사람의 권한 설정
const permissions = [
  'judge',
  'qna',
];

const universities = [
  '충북대학교',
  '한국교통대학교',
  '건국대학교',
  '서원대학교',
  '청주대학교',
  '공군사관학교',
  '우석대학교',
  '중원대학교',
  '세명대학교'
]

const centers = [
  '사업지원팀',
  'SW전공교육센터',
  'SW기초교육센터',
  'SW융합교육센터',
  'SW융합교육센터',
  'SW산학협력센터',
  '오픈소스SW센터'
];

const fileTypes = [
  'CorruptionReport',
  'Gallery',
  'Notice',
  'OverseasEducation',
  'PressRelease',
  'Resource',
  'StudentActivity',
  'UserInfo',
];

const qnaCategories = [
  '기초컴퓨터프로그래밍',
  '정보기술프로그래밍',
  '정보기술의 이해',
  '파이썬 프로그래밍',
  'IoT기술과 프로그래밍',
  '인공지능과 기계학습',
  '빅데이터 이해와 분석',
  '자료구조와 문제해결기법',
  'Java 프로그래밍 기초',
  '운영체제의 이해',
  '웹 응용 프로그래밍',
  '2022 예비대학'
];

const semesters = ['1학기', '여름학기', '2학기', '겨울학기'];

exports.OPERATOR_ROLES = operatorRoles;
exports.NOT_OPERATOR_ROLES = notOperatorRoles;
exports.ROLES = roles;
exports.PERMISSIONS = permissions;
exports.CENTERS = centers;
exports.NOTICE_CATEGORIES = centers;
exports.FILE_ACCESS = access;
exports.NOTICE_ACCESS = access;
exports.FILE_TYPES = fileTypes;
exports.QNA_CATEGORIES = qnaCategories;
exports.SEMESTERS = semesters;
exports.UNIVERSITIES = universities;
