const { createSchema } = require('../../helpers');
const { orderingPlugin } = require('../../plugins');
const schema = createSchema({
  name: {
    type: String,
  },
  order: {
    type: Number,
    index: true,
  }
});

schema.plugin(orderingPlugin());

module.exports = schema;
