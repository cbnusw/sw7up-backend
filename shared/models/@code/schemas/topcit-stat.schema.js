const { createSchema } = require('../../helpers');

const subjectSchema = createSchema({
  name: String,
  score: Number,
}, false);

const schema = createSchema({
  category: {
    type: String,
  },
  no: {
    type: Number,
    index: true,
  },
  year: {
    type: Number,
    index: true,
  },
  totalScore: {
    type: Number,
  },
  subjects: {
    type: [subjectSchema],
  }
}, {
  timestamps: false,
});

module.exports = schema;
