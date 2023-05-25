const { createSchema } = require('../../helpers');

const schema = createSchema({
  department: {
    type: String,
    index: true,
  },
  no: {
    type: String,
    index: true,
  },
  name: {
    type: String,
    index: true,
  },
  level: {
    type: Number,
    index: true
  },
  registeredAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: false
});

module.exports = schema;
