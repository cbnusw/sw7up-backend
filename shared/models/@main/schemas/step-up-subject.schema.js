const { createSchema } = require('../../helpers');
const { Schema } = require('mongoose');

const schema = createSchema({
  name: {
    type: String,
  },
  order: {
    type: Number,
    index: true,
  },
  level: {
    type: Schema.Types.ObjectId,
    ref: 'StepUpLevel',
    index: true,
    required: true,
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'StepUpSubject',
    index: true,
    default: null,
  }
});

module.exports = schema;
