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
  creator: {
    // Ref UserInfo
    type: Schema.Types.ObjectId
  }
}, {
  updatedAt: false,
});

module.exports = schema;
