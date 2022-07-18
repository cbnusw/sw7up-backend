const httpErrors = require('http-errors');

const createError = err => {
  const e = httpErrors(err[0], err[1]);
  e.code = err[2];
  return e;
};

const errors = {
  // 400 Errors
  CAT_NOT_READ_SOURCE_FILE: [400, '소스 파일을 읽을 수 없습니다.'],
  EMAIL_USED: [400, '이미 사용하고 있는 이메일입니다.'],
  FILE_NOT_UPLOADED: [400, '파일 업로드에 실패했습니다.'],
  INVALID_NEWSLETTER_FILE: [400, '올바르지 않은 뉴스레터 파일입니다.'],
  INVALID_OTP: [400, '잘못된 OTP 코드입니다.'],
  INVALID_PASSWORD: [400, '잘못된 비밀번호입니다.'],
  INVALID_PROJECT_META_NAME: [400, '잘못된 메타정보의 필드이름입니다.'],
  INVALID_ROLE: [400, '잘못된 회원 유형입니다.'],
  NEWSLETTER_FILE_REQUIRED: [400, '뉴스레터 파일이 필요합니다.'],
  PASSWORD_REQUIRED: [400, '비밀번호가 필요합니다.'],
  PHONE_NUMBER_USED: [400, '이미 사용하고 있는 전화번호입니다.'],
  PROJECT_ID_REQUIRED: [400, '프로젝트 아이디가 필요합니다.'],
  PROJECT_META_NAME_REQUIRED: [400, '프로젝트 메타정보의 필드 이름이 필요합니다.'],
  REG_NUMBER_REQUIRED: [400, '학번 또는 교번이 필요합니다.'],
  REG_NUMBER_USED: [400, '이미 등록된 학번 또는 교번입니다.'],
  USER_DELETED: [400, '삭제된 회원입니다.'],
  USER_DEPARTMENT_REQUIRED: [400, '사용자 소속 학과가 필요합니다.'],
  USER_EMAIL_REQUIRED: [400, '사용자 이메일이 필요합니다.'],
  USER_INFO_NOT_MATCHED: [400, '사용자 정보가 일치하지 않습니다.'],
  USER_INFO_REQUIRED: [400, '사용자 정보가 필요합니다.'],
  USER_NAME_REQUIRED: [400, '사용자 이름이 필요합니다.'],
  USER_NOT_DELETED: [400, '삭제된 회원이 아닙니다.'],
  USER_PHONE_REQUIRED: [400, '사용자 연락처가 필요합니다.'],
  WRITER_INFO_REQUIRED: [400, '작성자 정보가 필요합니다.'],
  YEAR_MONTH_REQUIRED: [400, '연월 정보가 필요합니다.'],
  GITHUB_ACCOUNT_USED: [400, '이미 등록된 Github 계정입니다.'],
  
  // 401 Errors
  ACCESS_TOKEN_EXPIRED: [401, '액세스 토큰이 만료되었습니다.'],
  ACCESS_TOKEN_REQUIRED: [401, '인증토큰이 필요합니다.'],
  INVALID_ACCESS_TOKEN: [401, '유효하지 않은 액세스 토근입니다.'],
  INVALID_REFRESH_TOKEN: [401, '유효하지 않은 리프레시 토근입니다.'],
  LOGIN_REQUIRED: [401, '로그인이 필요합니다.'],
  REFRESH_TOKEN_EXPIRED: [401, '리프레시 토큰이 만료되었습니다.'],
  USER_ACCOUNT_DELETED: [401, '계정이 삭제된 회원입니다.'],
  TOKEN_REQUIRED: [401, '토큰이 필요합니다.'],
  
  // 403 Errors
  FORBIDDEN: [403, '권한이 없는 요청입니다.'],
  
  // 404 Errors
  CORRUPTION_REPORT_NOT_FOUND: [404, '찾을 수 없는 신고입니다.'],
  GALLERY_NOT_FOUND: [404, '찾을 수 없는 갤러리입니다.'],
  GITHUB_ACCOUNT_NOT_FOUND: [404, '찾을 수 없는 Github계정입니다.'],
  LANGUAGE_FILTER_NOT_FOUND: [404, '찾을 수 없는 언어 필터입니다.'],
  LOCAL_PROJECT_NOT_FOUND: [404, '찾을 수 없는 로컬 프로젝트입니다.'],
  NOT_FOUND: [404, '찾을 수 없는 요청입니다.'],
  NOTICE_NOT_FOUND: [404, '찾을 수 없는 공지글입니다.'],
  OVERSEAS_EDUCATION_NOT_FOUND: [404, '찾을 수 없는 해외교육글입니다.'],
  PRESS_RELEASE_NOT_FOUND: [404, '찾을 수 없는 보도 자료입니다.'],
  PROJECT_NOT_FOUND: [404, '찾을 수 없는 프로젝트입니다.'],
  PROJECT_FILE_NOT_FOUND: [404, '찾을 수 없는 프로젝트 파일입니다.'],
  PROJECT_TEAM_NOT_FOUND: [404, '찾을 수 없는 프로젝트 팀입니다.'],
  PUBLIC_PROJECT_NOT_FOUND: [404, '찾을 수 없는 공개프로젝트입니다.'],
  QNA_NOT_FOUND: [404, '찾을 수 없는 Q&A입니다.'],
  REPLY_NOT_FOUND: [404, '찾을 수 없는 댓글입니다.'],
  RESOURCE_NOT_FOUND: [404, '찾을 수 없는 자료입니다.'],
  STUDENT_ACTIVITY_NOT_FOUND: [404, '찾을 수 없는 학생활동사례입니다.'],
  USER_EMAIL_NOT_FOUND: [404, '가입되지 않은 이메일입니다.'],
  USER_INFO_NOT_FOUND: [404, '찾을 수 없는 사용자 정보입니다.'],
  USER_NOT_FOUND: [404, '찾을 수 없는 사용자입니다.'],
  
  SERVER_ERROR: [500, '서버 에러.'],
};

Object.keys(errors).forEach(key => {
  errors[key] = createError([...errors[key], key]);
});

module.exports = errors;
