const cheerio = require('cheerio');
const asyncHandler = require('express-async-handler');
const { promises, existsSync } = require('fs');
const { join } = require('path');
const { hasRoles } = require('../../../../shared/utils/permission');
const { createResponse } = require('../../../../shared/utils/response');
const { Newsletter, UserInfo } = require('../../../../shared/models');
const {
  ROOT_DIR,
  NEWSLETTER_DIR,
  WEB_APP_HOST,
} = require('../../../../shared/env');
const {
  INVALID_NEWSLETTER_FILE,
  NEWSLETTER_FILE_REQUIRED,
  YEAR_MONTH_REQUIRED
} = require('../../../../shared/errors');
const service = require('./service');

const getNewsletters = asyncHandler(async (req, res, next) => {
  const { query } = req;
  const documents = await Newsletter.search(query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, documents));
});

const getNewsletter = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await Newsletter.findById(id).populate({ path: 'writer', model: UserInfo });

  if (!user && !hasRoles(user)) {
    doc.hits++;
    doc.save();
  }

  res.json(createResponse(res, doc));
});

const unzip = asyncHandler(async (req, res, next) => {
  const { body, file } = req;
  const { yearMonth } = body;
  const zipFile = file ? join(ROOT_DIR, NEWSLETTER_DIR, file.filename) : null;

  if (!zipFile) return next(NEWSLETTER_FILE_REQUIRED);

  let err;
  if (!yearMonth) err = YEAR_MONTH_REQUIRED;
  else if (!/application\/.*zip.*/.test(file.mimetype)) err = INVALID_NEWSLETTER_FILE;

  if (err) {
    await promises.unlink(zipFile);
    return next(err);
  }

  const unzipPath = join(ROOT_DIR, NEWSLETTER_DIR, yearMonth);

  if (existsSync(unzipPath)) {
    await promises.rmdir(unzipPath, { recursive: true });
  }

  await service.unzip(zipFile, unzipPath);
  const indexPath = join(unzipPath, 'index.html');

  if (!existsSync(indexPath)) {
    await promises.unlink(unzipPath);
    return next(INVALID_NEWSLETTER_FILE);
  }

  const html = await promises.readFile(indexPath, { encoding: 'utf-8' });
  const baseUrl = `${WEB_APP_HOST}/${NEWSLETTER_DIR}/${yearMonth}`;
  const convertedHtml = html.replace(/="\.\//g, `="${baseUrl}/`);
  const $ = cheerio.load(convertedHtml);

  $('area').each(function () {
    $(this).attr('target', '_blank');
  });

  body.content = $('body').html();
  body.link = `${WEB_APP_HOST}/${NEWSLETTER_DIR}/${yearMonth}/index.html`;
  await promises.unlink(zipFile);
  next();
});

const createNewsletter = asyncHandler(async (req, res, next) => {
  const { body, user } = req;
  body.writer = user.info;

  const doc = await Newsletter.create(body);

  res.json(createResponse(res, doc));
});

const removeNewsletter = asyncHandler(async (req, res, next) => {
  const { params: { id } } = req;
  const doc = await Newsletter.findById(id);
  const { link } = doc;

  await Promise.all([doc.deleteOne(), service.removeFile(req, link)]);
  res.json(createResponse(res));
});

exports.getNewsletters = getNewsletters;
exports.getNewsletter = getNewsletter;
exports.unzip = unzip;
exports.createNewsletter = createNewsletter;
exports.removeNewsletter = removeNewsletter;
