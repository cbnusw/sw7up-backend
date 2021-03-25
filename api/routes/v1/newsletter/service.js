const { parse } = require('url');
const { join } = require('path');
const { createReadStream, promises } = require('fs');
const unzipper = require('unzipper');
const { hasPermission } = require('../../../../shared/utils/permission');
const { createUpload } = require('../../../../shared/utils/file');
const {
  ROOT_DIR,
  NEWSLETTER_DIR
} = require('../../../../shared/env');
const {
  FORBIDDEN,
  LOGIN_REQUIRED,
} = require('../../../../shared/errors');

const getNewsletterDir = url => {
  const separated = parse(url).pathname.split('/');
  return join(ROOT_DIR, separated.splice(0, separated.length - 1).join('/'));
};

const upload = createUpload(NEWSLETTER_DIR);

const removeFile = async (req, url) => {
  const { user } = req;

  if (!user) throw LOGIN_REQUIRED;
  if (!hasPermission(user, 'newsletter')) throw FORBIDDEN;
  await promises.rmdir(getNewsletterDir(url), { recursive: true });
};

const unzip = (zipFile, unzipPath) => new Promise((resolve, reject) =>
  createReadStream(zipFile)
    .pipe(unzipper.Extract({ path: unzipPath }))
    .on('error', reject)
    .on('finish', resolve)
);

exports.upload = upload;
exports.removeFile = removeFile;
exports.unzip = unzip;
