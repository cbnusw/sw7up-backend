const axios = require('axios');
const { GithubAccount, UserInfo } = require('../../../shared/models');

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
    usernames = [
      ...usernames,
      ...data.map(d => d.author?.login || d.commit?.author?.name).filter(username => !!username)
    ];
    page++;
  }
  
  const commitObject = usernames.reduce((acc, username) => {
    acc[username] = (acc[username] || 0) + 1;
    return acc;
  }, {});
  
  return await Promise.all(
    Object.keys(commitObject).map(async username => {
      let account = await GithubAccount.findOne({ username })
        .populate({ path: 'user', model: UserInfo })
        .select('-accessToken');
      if (!account) account = await GithubAccount.create({ username });
      return { committer: account, numOfCommits: commitObject[username] };
    })
  );
};

exports.getCommitInfo = getCommitInfo;
