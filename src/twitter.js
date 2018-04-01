// Npm dependencies
const _ = require('lodash');
const twitterWrapper = require('twitter');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const chalk = require('chalk');

// Local dependencies
const config = require('../config.js').twitter;
 
const log = msg => console.log(chalk.blue.bold(' Twitter > ') + msg);
const twitter = new twitterWrapper(config);

// Database
const adapter = new FileSync('./db/twitter_db.json');
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

const pullAll = async (endpoint, params, name = 'tweets') => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull){
    const {tweets: data} = await twitterGet(endpoint, params);
    if(data.length > 0) { 
      log(`${dataSorted.length + data.length} ${name} pulled`);
      dataSorted = _(data).sortBy('id').concat(dataSorted).value();
      params.max_id = _.first(dataSorted).id;
    }
    moreToPull = data.length >= params.count - 50;
  }
  return dataSorted;
};

const commonsParams = {
  screen_name: config.screen_name,
  count: 200
};

const pullTweets = async (sinceId) => {
  const params = _.assign({include_rts: true}, commonsParams);
  if(sinceId) {
    params.since_id = sinceId;
    log(chalk.bold('Updating') + ' tweets');
    const tweets = await pullAll('statuses/user_timeline', params);
    db.update('tweets', list => list.concat(tweets)).write();
    log(chalk.bold('Tweets update finished') + `, ${tweets.length} items total`);    
  }
  else {
    log(chalk.bold('Pulling all') + ' tweets');
    const tweets = await pullAll('statuses/user_timeline', params);
    db.set('tweets', tweets).write();
    log(chalk.bold('First tweets pull finished') + `, ${tweets.length} items total`);
  }
};

const pullFavorite = async (sinceId) => {
  const params = _.assign({}, commonsParams);
  if(sinceId) {
    params.since_id = sinceId;
    log(chalk.bold('Updating') + ' favorite');
    const favorite = await pullAll('favorites/list', params, 'favorite');
    db.update('favorite', list => list.concat(favorite)).write();
    log(chalk.bold('Favorite update finished') + `, ${favorite.length} items total`);    
  }
  else {
    log(chalk.bold('Pulling all') + ' favorite');
    const favorite = await pullAll('favorites/list', params, 'favorite');
    db.set('favorite', favorite).write();
    log(chalk.bold('First favorite pull finished') + `, ${favorite.length} items total`);
  }
};

(async () => {
  const lastFavorite = _.last(db.get('favorite').value());
  const lastTweets = _.last(db.get('tweets').value());

  await Promise.all([
    pullFavorite(lastFavorite ? lastFavorite.id : null),
    pullTweets(lastTweets ? lastTweets.id : null)
  ]);
})();
