// Npm dependencies
const _ = require('lodash');
const twitterWrapper = require('twitter');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Local dependencies
const {logger} = require('../helpers');
const config = require('../config_manager').twitter;

const {TWITTER: PULLER, STEP_STATUS} = require('../pullers_const');
const {STEPS} = PULLER;
const log = logger(PULLER);
const twitter = new twitterWrapper(config);

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);
db.defaults(PULLER.DEFAULT_DB).write();

// Data puller
const twitterGet = (endpoint, params) => (new Promise((resolve, reject) => {
  twitter.get(endpoint, params, (error, tweets, response) => {
    if (!error) {
      resolve({response, tweets});
    }
    reject(error);
  });
}));

const pullLoop = async (endpoint, params, logger = log) => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull){
    const {tweets: data} = await twitterGet(endpoint, params);
    if(data.length > 0) { 
      logger({msg: `${dataSorted.length + data.length}`});
      dataSorted = _(data).sortBy('id').concat(dataSorted).value();
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
      const tweets = await pullLoop(endpoint, pullerParams, llog);
      db.update(dbProps, list => list.concat(tweets)).write();
      llog({msg: `${tweets.length}`, status: STEP_STATUS.COMPLETE});
    }
    else {
      llog({msg: 'first pull'});
      const tweets = await pullLoop(endpoint, pullerParams, llog);
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

const pullTimelineSample = puller({
  name: 'Timeline',
  step: STEPS.TIMELINE,
  endpoint: 'statuses/home_timeline', // last 800 tweets
  params: {},
  dbProps: 'timeline_sample',
});

(async () => {
  log({msg: 'Ready !'});

  const lastFavorite = db.get('favorite').last().value();
  const lastTweets = db.get('tweets').last().value();

  await Promise.all([
    pullFavorite(lastFavorite ? lastFavorite.id_str : null),
    pullTweets(lastTweets ? lastTweets.id_str : null),
    pullTimelineSample(),
  ]).catch(exception => console.log(exception));

  db.set('last_pull', _.floor(_.now() / 1000)).write();
})();
