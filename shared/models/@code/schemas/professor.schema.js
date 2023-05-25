const { createSchema } = require('../../helpers');

const schema = createSchema({
  no: {
    type: String,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    index: true,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    index: true,
  }
}, { timestamps: false });

module.exports = schema;
