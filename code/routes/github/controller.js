const axios = require('axios');
const asyncHadler = require('express-async-handler');
const { GITHUB_CLIENT_ID: client_id, GITHUB_CLIENT_SECRET: client_secret } = require('../../../shared/env');
const { FORBIDDEN, GITHUB_ACCOUNT_USED, GITHUB_ACCOUNT_NOT_FOUND } = require('../../../shared/errors');
const { GithubAccount, Project, UserInfo } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { removeAllProjectFiles } = require('../../services/file.service');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';

const getMyGithubAccounts = async (req, res) => {
  const { user: { info } } = req;
  const documents = await GithubAccount.find({ user: info })
    .populate({ path: 'user', model: UserInfo });
  
  res.json(createResponse(res, documents));
};

const getGithubKey = (req, res) => res.json(createResponse(res, { clientId: client_id }));

const getGithubAccount = async (req, res) => {
  const { params: { username } } = req;
  let account = await GithubAccount.findOne({ username });
  if (!account) account = await GithubAccount.create({ username });
  res.json(createResponse(res, account));
};

const getGithubRepos = async (req, res) => {
  const { params: { accountId }, user, query: { page = 1, limit = 10 } } = req;
  let repos = [];
  const account = await GithubAccount.findById(accountId);
  
  if (!account) throw GITHUB_ACCOUNT_NOT_FOUND;
  if (String(account.user) !== String(user.info)) throw FORBIDDEN;
  
  const { accessToken } = account;
  
  const reposResponse = await axios.get('https://api.github.com/user/repos', {
    headers: {
      Accept: 'application/vnd.github.v3+json', Authorization: `token ${accessToken}`, 'User-Agent': USER_AGENT,
    },
    params: { per_page: +limit, page: +page, type: 'public', sort: 'created' }
  });
  
  const { data } = reposResponse;
  
  for (let repo of data) {
    const project = await Project.findOne({ isPublic: true, 'repo.url': repo.clone_url });
    
    if (!project) {
      const username = repo.owner.login;
      // const commitInfo = await getCommitInfo(accessToken, repo);
      let owner = await GithubAccount.findOne({ username }).select('username').lean();
      
      if (!owner) {
        await GithubAccount.create({ username });
        owner = await GithubAccount.findOne({ username }).select('username').lean();
      }
      
      repos.push({
        url: repo.clone_url,
        fullName: repo.full_name,
        name: repo.name,
        description: repo.description,
        size: repo.size,
        owner,
        // commitInfo,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
      });
    }
  }
  
  res.json(createResponse(res, repos));
};

const createGithubAccount = async (req, res) => {
  const { body: { code }, user } = req;
  
  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id,
      client_secret,
      code,
    }
  );
  
  const { data } = tokenResponse;
  const accessToken = data.split('&')[0].split('=')[1];
  
  const userResponse = await axios.get(
    'https://api.github.com/user',
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${accessToken}`,
        'User-Agent': USER_AGENT,
      }
    }
  );
  
  const { data: { login: username, created_at: createdAt, updated_at: updatedAt } } = userResponse;
  
  let account = await GithubAccount.findOne({ username });
  
  if (!account) {
    account = await GithubAccount.create({ username, accessToken, user: user.info, createdAt, updatedAt });
  } else if (account.user && String(account.user) !== String(user.info)) {
    throw GITHUB_ACCOUNT_USED;
  } else {
    account.accessToken = accessToken;
    account.user = user.info;
    account.createdAt = createdAt;
    account.updatedAt = updatedAt;
    await account.save();
  }
  
  res.json(createResponse(res, account));
};

const removeGithubAccount = async (req, res) => {
  const { params: { id }, user } = req;
  const account = await GithubAccount.findById(id);
  if (!account) throw GITHUB_ACCOUNT_NOT_FOUND;
  if (String(account.user) !== String(user.info)) throw FORBIDDEN;
  account.user = null;
  await Promise.all([account.save(), removeGithubProjects(id)]);
  res.json(createResponse(res));
};

async function removeGithubProjects (githubAccountId) {
  const projects = (await Project.find({ githubAccount: githubAccountId }).select('_id'))
    .map(project => project._id);
  
  await Promise.all([
    Project.deleteMany({ _id: { $in: projects } }),
    ...projects.map(id => removeAllProjectFiles(id))
  ]);
}

exports.getMyGithubAccounts = asyncHadler(getMyGithubAccounts);
exports.getGithubKey = getGithubKey;
exports.getGithubAccount = asyncHadler(getGithubAccount);
exports.getGithubRepos = asyncHadler(getGithubRepos);
exports.createGithubAccount = asyncHadler(createGithubAccount);
exports.removeGithubAccount = asyncHadler(removeGithubAccount);
