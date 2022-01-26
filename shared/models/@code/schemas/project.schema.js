const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');
const { searchPlugin } = require('../../plugins');
const { toRef, toRegEx, toBoolean } = require('../../mappers');

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
  language: String,
  files: Number,
  codes: Number,
  comments: Number
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

const commitInfoSchema = createSchema({
  committer: {
    type: Schema.Types.ObjectId,
    ref: 'GithubAccount',
  },
  commit: Number,
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
  semester: {
    type: String,
    enum: [null, '1학기', '여름학기', '2학기', '겨울학기'],
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
  ossList: [ossSchema],
  documents: [documentSchema],
  approvedAt: {
    type: Date,
    index: true,
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
    { path: 'team.member.github', model: 'GithubAccount' },
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
