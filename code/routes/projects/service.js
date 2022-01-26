const axios = require('axios');
const { promises } = require('fs');
const { join } = require('path');
const { ROOT_DIR } = require('../../../shared/env');
const { ProjectFile } = require('../../../shared/models');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';

const getCommitInfo = async (accessToken, repo) => {
  let usernames = [];
  let length = -1;
  let page = 1;
  while (usernames.length !== length) {
    length = usernames.length;
    const response = await axios.get(
      `https://api.github.com/repos/${repo.full_name}/commits`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${accessToken}`,
          'User-Agent': USER_AGENT,
        },
        params: { page, per_page: 100 }
      }
    );
    
    const { data } = response;
    usernames = [...usernames, ...data.map(d => d.commit.author.name)];
    page++;
  }
  
  const commitObject = usernames.reduce((acc, username) => {
    acc[username] = (acc[username] || 0) + 1;
    return acc;
  }, {});
  
  return Object.keys(commitObject).map(key => ({ member: key, commit: commitObject[key] }));
};

exports.getCommitInfo = getCommitInfo;

