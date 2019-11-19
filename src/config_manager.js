const _ = require('lodash');

const conf = {
  pocket: {
    consumer_key: process.env.POCKET_CONSUMER_KEY,
    redirect_uri: process.env.POCKET_REDIRECT_URI
  },
  twitter: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_TOKEN_SECRET,
    screen_name: process.env.TWITTER_SCREEN_NAME
  },
  youtube: {
    installed: {
      client_id: process.env.YOUTUBE_CLIENT_ID,
      project_id: process.env.YOUTUBE_PROJECT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://accounts.google.com/o/oauth2/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      redirect_uris: [
        'urn:ietf:wg:oauth:2.0:oob',
        'http://localhost'
      ]
    }
  },
  reddit: {
    userAgent: 'data-puller',
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD
  },
  github: {
    username: process.env.GITHUB_USERNAME,
    personal_access_token: process.env.GITHUB_TOKEN,
  }
};

try {
  const file_conf = require('../config.json');
  _.merge(conf, file_conf);
  conf.SOURCE = 'MIXED';
} catch (error) {
  conf.SOURCE = 'ENV';
}

module.exports = conf;
