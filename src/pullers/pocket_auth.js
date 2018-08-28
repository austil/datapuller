// Node dependencies
const readline = require('readline');

// Local dependencies
const auth = require('../auth_manager');

// Api Token
const getRequestToken = ({pocket, config}) => (new Promise((resolve, reject) => {
  pocket.getRequestToken(config, (err, resp, body) => {
    if (err) { 
      reject('Get request token failed ' + JSON.stringify(err)); 
    }
    else {
      const json = JSON.parse(body);
      resolve(json.code);
    }
  });
}));

const authorizeApp = ({pocket, config, log}) => (new Promise((resolve) => {
  log(`Authorize this app at : ${pocket.getAuthorizeURL(config)}`);
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  rl.question('Press enter to continue when you\'re done ', () => {
    rl.close();
    resolve();
  });
}));

const getAccesstoken = ({pocket, config}) => (new Promise((resolve, reject) => {
  pocket.getAccessToken(config, (err, resp, body) => {
    if (err) {
      reject('Get access token failed ' + JSON.stringify(err));
    }
    else {
      const json = JSON.parse(body);
      resolve(json.access_token);
    }
  });
}));

const getAccess = ({pocket, config, log}) => {
  return getRequestToken({pocket, config})
    .then(requestToken => {
      config.request_token = requestToken;
      log(`Request token : ${requestToken}`);
    })
    .then(() => authorizeApp({pocket, config, log}))
    .then(() => getAccesstoken({pocket, config}))
    .then(accessToken => {
      auth.set('pocket', {access_token: accessToken});
      log(`Access token : ${accessToken}`);
    })
    .catch(err => log(err));
};

module.exports = {
  getAccess
};
