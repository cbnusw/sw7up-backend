const { createSchema } = require('../../helpers');
const { Schema } = require('mongoose');

const schema = createSchema({
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'StepUpSubject',
    index: true,
  },
  title: {
    type: String,
    trim: true
  },
  problem: {
    type: String,
  },
  solution: {
    type: String,
  },
  hits: {
    type: Number,
    default: 0,
  },
  writer: {
    type: Schema.Types.ObjectId,
    required: true,
  }
});

module.exports = schema;
