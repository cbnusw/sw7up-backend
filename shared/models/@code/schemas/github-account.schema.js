const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');
const { searchPlugin } = require('../../plugins');
const { toRef, toRegEx } = require('../../mappers');

const schema = createSchema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  accessToken: {
    type: String,
    default: null,
  },
  user: {
    // ref: UserInfo Model
    type: Schema.Types.ObjectId,
    index: true,
    default: null,
  },
  createdAt: {
    type: Date,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: false,
});

schema.index({ username: 1, user: 1 }, { unique: true });
schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });

schema.plugin(searchPlugin({
  sort: 'username',
  mapper: {
    username: toRegEx,
    email: toRegEx,
    user: toRef('UserInfo', {
      name: toRegEx,
    })
  },
  populate: [
    { path: 'user', model: 'UserInfo' }
  ]
}));

module.exports = schema;
