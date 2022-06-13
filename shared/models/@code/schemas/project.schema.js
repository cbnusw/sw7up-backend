const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');
const { searchPlugin } = require('../../plugins');
const { toRef, toRegEx, toBoolean } = require('../../mappers');
const { SEMESTERS } = require('../../../constants');

const bannerSchema = createSchema({
  link: String,
  file: {
    type: Schema.Types.ObjectId,
    ref: 'ProjectFile',
  }
}, false);

const mentoSchema = createSchema({
  name: String,
  organization: String,
  position: String,
}, false);

const subjectSchema = createSchema({
  name: String,
  professor: String,
  mentoList: [mentoSchema]
}, false);

const ownProjectSchema = createSchema({
  type: {
    type: String,
    enum: ['공모전', '경진대회', '동아리', '기타'],
    default: '기타'
  },
  mentoList: [mentoSchema]
}, false);

const notJoinedMemberSchema = createSchema({
  no: String,
  school: String,
  name: String,
  department: String,
}, false);

const memberSchema = createSchema({
  github: [
    {
      type: Schema.Types.ObjectId,
      ref: 'GithubAccount'
    }
  ],
  joined: [Schema.Types.ObjectId],
  notJoined: [notJoinedMemberSchema]
}, false);

const teamSchema = createSchema({
  name: String,
  member: memberSchema,
}, false);

const metaSchema = createSchema({
  language: {
    type: String,
    default: null,
  },
  files: {
    type: Number,
    default: 0,
  },
  codes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0,
  }
}, false);

const ossSchema = createSchema({
  name: String,
  link: String,
  license: String,
  description: String,
}, false);

const documentSchema = createSchema({
  name: String,
  file: {
    type: Schema.Types.ObjectId,
    ref: 'ProjectFile'
  }
}, false);

const approvalSchema = createSchema({
  value: {
    type: Boolean,
    index: true,
  },
  date: {
    type: Date,
    index: true,
  },
  reason: String,
}, false);

const commitInfoSchema = createSchema({
  committer: {
    type: Schema.Types.ObjectId,
    ref: 'GithubAccount',
  },
  numOfCommits: Number,
}, false);

const repoSchema = createSchema({
  url: {
    type: String,
    index: true,
  },
  fullName: String,
  name: String,
  description: String,
  size: Number,
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'GithubAccount',
  },
  commitInfo: [commitInfoSchema],
  createdAt: Date,
  updatedAt: Date,
}, false);

const schema = createSchema({
  banners: [bannerSchema],
  name: {
    type: String,
    index: true,
  },
  grade: Number,
  year: Number,
  department: {
    type: String,
    index: true,
  },
  semester: {
    type: String,
    enum: [null, ...SEMESTERS],
    default: null,
  },
  description: {
    type: String,
    required: true,
  },
  projectType: {
    type: String,
    enum: ['교과목프로젝트', '자체프로젝트']
  },
  subject: {
    type: subjectSchema,
    default: null
  },
  ownProject: {
    type: ownProjectSchema,
    default: null
  },
  team: {
    type: teamSchema,
    default: null,
  },
  isPublic: {
    type: Boolean,
    index: true,
    default: false,
  },
  repo: repoSchema,
  sourceDir: String,
  source: {
    type: Schema.Types.Mixed,
    default: null,
  },
  meta: [metaSchema],
  
  // 메타 정보가 업데이트 중인지 체크하기 위한 필드, 업데이트 중이라면 true
  metaUpdating: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  ossList: [ossSchema],
  documents: [documentSchema],
  approval: {
    type: approvalSchema,
    default: null,
  },
  creator: {
    type: Schema.Types.ObjectId,
    index: true,
    require: true,
  },
  githubAccount: {
    type: Schema.Types.ObjectId,
    ref: 'GithubAccount',
    index: true,
    default: null,
  }
});

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });

schema.plugin(searchPlugin({
  populate: [
    { path: 'banners.file', model: 'ProjectFile ' },
    { path: 'creator', model: 'UserInfo' },
    {
      path: 'team.member.github', model: 'GithubAccount',
      populate: [{ path: 'user', model: 'UserInfo' }]
    },
    { path: 'team.member.joined', model: 'UserInfo' },
  ],
  mapper: {
    reposition: toRegEx,
    name: toRegEx,
    isPublic: toBoolean,
    owner: toRef('UserInfo', {
      no: toRegEx,
      name: toRegEx,
    }),
    members: toRef('UserInfo', {
      no: toRef,
      name: toRegEx,
    }),
  }
}));

module.exports = schema;
