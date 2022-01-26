const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');

const schema = createSchema({
  path: {
    type: String,
    unique: true,
  },
  name: String,
  size: Number,
  type: String,
  project: {
    type: Schema.Types.ObjectId,
    index: true,
    default: null,
  },
  temporary: {
    type: Boolean,
    default: false,
  },
  creator: {
    // Ref UserInfo
    type: Schema.Types.ObjectId
  }
}, {
  updatedAt: false,
});

module.exports = schema;
