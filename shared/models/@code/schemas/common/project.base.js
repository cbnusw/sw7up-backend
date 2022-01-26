const { Schema } = require('mongoose');
const { createSchema } = require('../../../helpers');

const metaSchema = createSchema({
  /**
   * Python pygount 모듈을 사용하여 분석
   */

  // 언어(Python, C++, Java 등)
  language: {
    type: String,
  },
  // 파일 갯수
  files: {
    type: Number,
  },
  // 코드 라인수
  codes: {
    type: Number,
  },
  // 주석 갯수
  comments: {
    type: Number,
  }
}, false);

const mentoSchema = createSchema({
  name: String,         // 멘토이름
  organiztion: String,  // 멘토 소속 기관
  position: String,     // 직책
}, false);

const subjectSchema = createSchema({
  name: String,       // 교과목 명, 공백은 제거하고 저장
  professor: String,  // 담당 교수
  mento: mentoSchema, // 멘토 정보
}, false);

const ownProjectSchema = createSchema({
  type: {
    type: String,
    enum: ['공모전', '경진대회', '동아리', '기타'],
    default: '기타'
  },       // 프로젝트 유형(공모전, 기타 등등)
  mento: mentoSchema,
}, false);

const bannerSchema = createSchema({
  link: String,
  file: {
    type: Schema.Types.ObjectId,
    ref: 'ProjectFile'
  }
}, false);

const ossSchema = createSchema({
  name: String,         // 오픈소스 이름
  link: String,         // 오픈소스의 링크
  license: String,      // 오픈소스 라이선스
  description: String,  // 오픈소스 사용 내용 설명
}, false);


const documentSchema = createSchema({
  name: String,
  file: {
    type: Schema.Types.ObjectId,
    ref: 'ProjectFile'
  },
});

const teamSchema = createSchema({
  name: String,
  members: [Schema.Types.ObjectId]
}, false);

const base = {
  banners: [bannerSchema],
  // 프로젝트 명
  name: {
    type: String,
    index: true,
  },
  grade: Number,
  year: Number,       // 프로젝트 수행 연도
  semester: {         // 프로젝트 수횅 학기
    type: String,
    enum: [null, '1학기', '여름학기', '2학기', '겨울학기'],
    default: null
  },
  projectType: {
    type: String,
    enum: ['교과목프로젝트', '자체프로젝트']
  },
  subject: subjectSchema,       // 교과목 정보
  ownProject: ownProjectSchema, // 자체 프로젝트 정보
  source: {
    /**
     * ProjectFile: { file: Schema.Types.ObjectId }
     * DirectoryEntry: { dirname: String, entries: EntryList }
     * EntryList => Array<ProjectFile | DirectoryEntry>
     */
    type: Schema.Types.Mixed,
    default: null,
  },
  meta: [metaSchema],
  ossList: [ossSchema],
  team: {
    type: teamSchema,
    default: null,
  },
  documents: [documentSchema],
  creator: {
    type: Schema.Types.ObjectId,
    index: true
  }
};

module.exports = base;
