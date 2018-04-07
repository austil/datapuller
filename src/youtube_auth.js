// Node dependencies
const readline = require('readline');

// Local dependencies
const auth = require('./auth_manager');

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

const authorizeApp = ({oauth2Client, log}) => (new Promise((resolve, reject) => {
  const authUrl = oauth2Client.generateAuthUrl({access_type: 'offline', scope: SCOPES});
  log(`Authorize this app at : ${authUrl}`);

  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        reject('Get access token failed ' + JSON.stringify(err));
      }
      auth.set('youtube', token);
      resolve();
    });
  });
}));

const getAccess = ({oauth2Client, log}) => {
  return authorizeApp({oauth2Client, log})
    .catch(err => log(err));
};

module.exports = {
  getAccess
};
