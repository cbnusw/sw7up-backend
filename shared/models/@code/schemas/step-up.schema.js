const { createSchema } = require('../../helpers');

const subjectSchema = createSchema({
  name: String,
  score: {
    type: Number,
    default: 0,
  }
}, false);

const schema = createSchema({
  // YYYY-${0 | 1 | 2 | 3}의 형태, 0: 1학기, 1: 여름학기, 2: 2학기, 3: 겨울학기
  performedAt: {
    type: String,
    index: true,
    required: true,
  },
  level: {
    type: Number,
    index: true,
    required: true,
  },
  pass: {
    type: Boolean,
    index: true,
    required: true,
  },
  department: {
    type: String,
    index: true,
    required: true,
  },
  no: {
    type: String,
    index: true,
    required: true,
  },
  grade: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    index: true,
    required: true,
  },
  subjects: {
    type: [subjectSchema],
  }
}, {
  updatedAt: false,
});

schema.index({ performedAt: 1, no: 1 }, { unique: true });

module.exports = schema;
