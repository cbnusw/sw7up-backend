const { createSchema } = require('../../helpers');
const { Schema } = require('mongoose');
const { searchPlugin } = require('../../plugins');
const { toRegEx } = require('../../mappers');

const schema = createSchema({
  name: {
    type: String,
    index: true
  },
  creator: Schema.Types.ObjectId
}, { updatedAt: false });

schema.plugin(searchPlugin({
  sort: 'name',
  mapper: {
    name: toRegEx
  },
  populate: [
    { path: 'creator', model: 'UserInfo' }
  ]
}));

module.exports = schema;
