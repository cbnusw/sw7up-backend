const { readdirSync } = require('fs');

module.exports = async () => {
  const seedModules = readdirSync(__dirname)
    .filter(file => /\.seeds\.js$/.test(file))
    .map(file => require(`./${file}`));

  for (let createSeeds of seedModules) await createSeeds();
};
