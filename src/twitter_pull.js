// Npm dependencies
const _ = require('lodash');
const twitterWrapper = require('twitter');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Local dependencies
const {logger} = require('./helpers');
const auth = require('./auth_manager');
const twitterAuth = require('./twitter_auth');
const config = require('../config.js').twitter;

const {TWITTER: PULLER, STEP_STATUS} = require('./const');
const log = logger(PULLER);
let twitter = {};

const STEPS = {
  FAVORITE: 0,
  TWEETS: 1
};

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);

db.defaults({
  tweets: [],
  favorite: []
}).write();

// Data puller
const twitterGet = (endpoint, params) => (new Promise((resolve, reject) => {
  twitter.get(endpoint, params, (error, tweets, response) => {
    if (!error) {
      resolve({response, tweets});
    }
    reject(error);
  });
}));

const pullAll = async (endpoint, params, logger = log) => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull){
    const {tweets: data} = await twitterGet(endpoint, params);
    if(data.length > 0) { 
      logger({msg: `${dataSorted.length + data.length}`});
      dataSorted = _(data).sortBy('id_str').concat(dataSorted).value();
      params.max_id = _.first(dataSorted).id_str;
    }
    moreToPull = data.length >= params.count - 50;
  }
  return dataSorted;
};

const commonsParams = {
  screen_name: config.screen_name,
  count: 200
};

const puller = ({name, step, endpoint, params, dbProps}) => {
  return async (sinceId) => {
    const llog = ({msg, status = STEP_STATUS.IN_PROGRESS}) => log({msg: name + ': ' + msg, status, step});
    const pullerParams = _.assign(params, commonsParams);

    if(sinceId) {
      pullerParams.since_id = sinceId;
      llog({msg: 'starting update'});
      const tweets = await pullAll(endpoint, pullerParams, llog);
      db.update(dbProps, list => list.concat(tweets)).write();
      llog({msg: `${tweets.length}`, status: STEP_STATUS.COMPLETE});
    }
    else {
      llog({msg: 'first pull'});
      const tweets = await pullAll(endpoint, pullerParams, llog);
      db.set(dbProps, tweets).write();
      llog({msg: `${tweets.length}`, status: STEP_STATUS.COMPLETE});
    }
  };
};

const pullTweets = puller({
  name: 'Tweets',
  step: STEPS.TWEETS,
  endpoint: 'statuses/user_timeline',
  params: {include_rts: true},
  dbProps: 'tweets'
});

const pullFavorite = puller({
  name: 'Favorite',
  step: STEPS.FAVORITE,
  endpoint: 'favorites/list',
  params: {},
  dbProps: 'favorite'
});

(async () => {
  // Api tokens
  if(auth.has(PULLER.NAME) === false) {
    log({msg: 'No bearer token found, lets get one'});
    await twitterAuth.getBearerToken(config);
  }
  config.bearer_token = auth.get(PULLER.NAME).bearer_token;
  twitter = new twitterWrapper(config);
  log({msg: 'Ready !'});

  const lastFavorite = db.get('favorite').last().value();
  const lastTweets = db.get('tweets').last().value();

  await Promise.all([
    pullFavorite(lastFavorite ? lastFavorite.id_str : null),
    pullTweets(lastTweets ? lastTweets.id_str : null)
  ]).catch(exception => console.log(exception));
})();
