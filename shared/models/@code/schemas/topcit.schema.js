const { createSchema } = require('../../helpers');

const subjectSchema = createSchema({
  name: String,
  score: {
    type: Number,
    default: null,
  },
}, false);

const studentSchema = createSchema({
  department: {
    type: String,
    index: true,
  },
  grade: {
    type: String,
    index: true,
    default: null,
  },
  no: {
    type: String,
    index: true,
  },
  name: {
    type: String,
    index: true,
  }
}, false);

const schema = createSchema({
  no: {
    type: Number,
    index: true,
  },
  year: {
    type: Number,
    index: true,
  },
  student: {
    type: studentSchema,
    required: true,
  },
  level: {
    type: Number,
    index: true,
    default: null,
  },
  totalScore: {
    type: Number,
    default: null,
  },
  subjects: {
    type: [subjectSchema],
  },
}, {
  timestamps: false,
});

module.exports = schema;
