const request = require('request-promise-native');

// Local dependencies
const auth = require('./auth_manager');

const getBearerToken = async (config) => {
  const {consumer_key, consumer_secret} = config;
  const bearer_credential = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');

  const response = JSON.parse(await request({
    method: 'POST',
    uri: 'https://api.twitter.com/oauth2/token',
    headers: {
      'Authorization': `Basic ${bearer_credential}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8.'
    },
    body: 'grant_type=client_credentials'
  }));

  if(response.access_token) {
    auth.set('twitter', {bearer_token: response.access_token});
  }
  else {
    throw 'Unable to obtain a bearer token';
  }
};

module.exports = {
  getBearerToken
};