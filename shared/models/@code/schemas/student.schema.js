const { createSchema } = require('../../helpers');
const { Schema } = require('mongoose');

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
  },
  grade: {
    type: String,
    index: true,
    default: null,
  },
  note: {
    type: String,
    default: null,
  },
  professor: {
    type: Schema.Types.ObjectId,
    ref: 'Professor',
    index: true,
  }
}, { timestamps: false });

module.exports = schema;
