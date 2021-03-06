const asyncHandler = require('express-async-handler');
const { Qna, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasPermission } = require('../../../../shared/utils/permission');
const { sendMail } = require('../../../../shared/services/mail');
const { WEB_APP_HOST } = require('../../../../shared/env');
const {
  FORBIDDEN,
  INVALID_PASSWORD,
  PASSWORD_REQUIRED,
  QNA_NOT_FOUND,
  REPLY_NOT_FOUND,
  WRITER_INFO_REQUIRED,
} = require('../../../../shared/errors');


const getQnAs = asyncHandler(async (req, res, next) => {
  const { query } = req;
  const documents = await Qna.search(query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, documents));
});

const getQnA = asyncHandler(async (req, res, next) => {
  const { params: { id }, body, user } = req;
  const { password } = body || {};

  console.log(password);

  const doc = await Qna.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate({ path: 'replies.writer', model: UserInfo });

  if (!doc) return next(QNA_NOT_FOUND);

  const permission = hasQnAPermission(doc, user, password);
  if (!doc.confirm) {
    if (!permission) return next(FORBIDDEN);
  }

  const data = JSON.parse(JSON.stringify(doc));

  data.permission = permission;
  delete data.hashedPassword;

  res.json(createResponse(res, data));
});

const createQnA = asyncHandler(async (req, res, next) => {
  const { body, user } = req;

  if (user) {
    body.writer = user.info;
    delete body.password;
    delete body.writerInfo;
  } else {
    if (!body.writerInfo) return next(WRITER_INFO_REQUIRED);
    if (!body.password) return next(PASSWORD_REQUIRED);
    delete body.writer;
  }

  const doc = await Qna.create(body);

  res.json(createResponse(res, doc));
});

const addReply = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: { password, content }, user } = req;
  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);
  if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);

  const reply = { content };

  if (user) reply.writer = user.info;
  else reply.writerInfo = doc.writerInfo;

  doc.replies = [...doc.replies, reply];
  doc.confirm = user && String(doc.writer) !== String(user.info);

  if (doc.confirm) {
    const writer = doc.writer ? await UserInfo.findById(doc.writer) : doc.writerInfo;
    if (writer && writer.email) sendMail('E-Help Desk ?????? ??????', createQnAContent(doc), writer.email);
  }

  await doc.save();

  res.json(createResponse(res));
});

const checkPassword = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: { password }, user } = req;

  // ???????????? ???????????? ???????????? ?????? ??????(???????????? ????????? ????????? ?????? ???????????? ??????)
  if (user) return next(FORBIDDEN);

  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);
  if (doc.writer) return next(FORBIDDEN);
  if (!doc.authenticate(password)) return next(INVALID_PASSWORD);

  res.json(createResponse(res));
});

const updateQnA = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: $set, user } = req;
  const { password } = $set;

  // ?????? ???????????? ?????? ??????
  delete $set.password;
  delete $set.replies;

  // ????????? ?????? ???????????? ?????? ?????? ??? ??? ????????? ???
  $set.confirm = false;

  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);
  if (!isMyQnA(doc, user, password)) return next(FORBIDDEN);

  await doc.updateOne({ $set });

  res.json(createResponse(res));
});

const updateReply = asyncHandler(async (req, res, next) => {
  const { params: { id, replyId }, body: { content, password }, user } = req;
  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);
  if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);

  const reply = doc.replies.find(r => String(r._id) === String(replyId));

  if (!reply) return next(REPLY_NOT_FOUND);

  // ????????? ????????? ????????? ????????? ?????? ????????? ??????
  if (user) {
    if (String(reply.writer) !== String(user.info)) return next(FORBIDDEN);
  } else {
    if (reply.writer) return next(FORBIDDEN);
  }

  if (!isMyQnA(doc, user, password) && user && hasPermission(user, 'qna')) {
    doc.confirm = true;
    const writer = doc.writer ? await UserInfo.findById(doc.writer) : doc.writerInfo;
    if (writer && writer.email) sendMail('E-Help Desk ?????? ?????? ??????', createQnAContent(doc), writer.email);
  }

  reply.content = content;
  await doc.save();

  res.json(createResponse(res));
});

const confirm = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: { confirm } } = req;
  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);

  doc.confirm = confirm;
  await doc.save();

  res.json(createResponse(res));
});

const removeQnA = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: { password }, user } = req;
  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);
  if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);

  await doc.deleteOne();

  res.json(createResponse(res));
});

const removeReply = asyncHandler(async (req, res, next) => {
  const { params: { id, replyId }, body: { password } = {}, user } = req;
  const doc = await Qna.findById(id);

  if (!doc) return next(QNA_NOT_FOUND);
  if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);
  const idx = doc.replies.findIndex(r => String(r._id) === String(replyId));
  if (idx === -1) return next(REPLY_NOT_FOUND);

  const reply = doc.replies[idx];

  // ????????? ????????? ????????? ????????? ?????? ????????? ??????
  if (user) {
    if (String(reply.writer) !== String(user.info)) return next(FORBIDDEN);
  } else {
    if (reply.writer) return next(FORBIDDEN);
  }
  doc.replies.splice(idx, 1);
  await doc.save();

  res.json(createResponse(res));
});

function hasQnAPermission(qna, user, password) {
  if (hasPermission(user, 'qna')) return true;

  const writerId = qna.writer ? qna.writer._id || qna.writer : null;

  if (writerId && user && String(writerId) === String(user.info)) return true;
  else if (password && qna.authenticate(password)) return true;
  return false;
}

function isMyQnA(qna, user, password) {
  const writerId = qna.writer ? qna.writer._id || qna.writer : null;
  if (writerId && user && String(writerId) === String(user.info)) return true;
  else if (password && qna.authenticate(password)) return true;
  return false;
}

function createQnAContent(qna, edit = false) {
  return `<p>E-Help Desk??? ????????? ????????? ?????? ????????? ${edit ? '?????????????????????' : '?????????????????????.'}.<br>
???????????? ?????? ?????? ????????? ????????? ???????????????.</p>
<a href="${WEB_APP_HOST}/community/e-help/detail/${qna._id}">?????? ??????</a>`;
}

exports.getQnAs = getQnAs;
exports.getQnA = getQnA;
exports.createQnA = createQnA;
exports.addReply = addReply;
exports.checkPassword = checkPassword;
exports.updateQnA = updateQnA;
exports.updateReply = updateReply;
exports.confirm = confirm;
exports.removeQnA = removeQnA;
exports.removeReply = removeReply;
