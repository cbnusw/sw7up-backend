const { readdirSync, statSync } = require('fs');
const { join } = require('path');

async function run () {
  await Promise.all(readdirSync(__dirname)
    .filter(dir => statSync(join(__dirname, dir)).isDirectory())
    .map(dir => require(join(__dirname, dir))())
  );
}

run()
  .catch(console.error)
  .then(() => {
    console.log('migration complete!!!');
    process.exit(0);
  });

