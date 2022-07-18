const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');
const { searchPlugin } = require('../../plugins');
const { toRegEx, toRef } = require('../../mappers');

const schema = createSchema({
  title: {
    type: String,
    trim: true,
    index: true,
  },
  content: String,
  writer: {
    type: Schema.Types.ObjectId,
    index: true,
    required: true,
  },
  hits: {
    type: Number,
    default: 0,
  },
  attachments: [{ type: Schema.Types.ObjectId, ref: 'File', required: true }],
});

schema.index({ createdAt: -1 });

schema.plugin(searchPlugin({
  sort: '-createdAt',
  mapper: {
    title: toRegEx,
    writer: toRef('UserInfo', {
      name: toRegEx
    }),
  }
}));

module.exports = schema;
