const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');
const { searchPlugin } = require('../../plugins');
const { toRegEx, toRef } = require('../../mappers');

const pictureSchema = createSchema({
  url: {
    type: String,
    required: true,
  },
  caption: String,
}, false);

const schema = createSchema({
  title: {
    type: String,
    trim: true,
    required: true,
    index: true,
  },
  pictures: [pictureSchema],
  hits: {
    type: Number,
    default: 0,
  },
  writer: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  createdAt: false
});

schema.index({ createdAt: -1 });

schema.plugin(searchPlugin({
  sort: '-createdAt',
  mapper: {
    title: toRegEx,
    writer: toRef('UserInfo', {
      name: toRegEx
    })
  }
}));

module.exports = schema;
