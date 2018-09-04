const _ = require('lodash');
const sstats = require('simple-statistics');
const {makeTable} = require('./report_utils');
const {TWITTER} = require('../pullers_const');
const {tweets, favorite, timeline_sample} = require('../../' + TWITTER.FILE);

const reportTitle = TWITTER.COLOR('Twitter Report');

const retweets = tweets.filter(t => t.retweeted);
const ownTweets = tweets.filter(t => t.retweeted === false);

// Simple at first, the detailled count of items
const reportCount = makeTable(
  'Items count',
  [
    ['Tweets:', tweets.length],
    ['  Owns:', ownTweets.length],
    ['  ReTweets:', retweets.length],
    ['Favorites:', favorite.length]
  ],
  { lastRowBold: false }
);

// Most retweeted & liked user
const TOP_NB = 10;
const topBy = (list, groupKey) => _(list)
  .groupBy(groupKey)
  .toPairs()
  .map(([name, ts]) => [name, ts.length])
  .sortBy(([ , nb]) => nb)
  .takeRight(TOP_NB)
  .reverse()
  .value();

const retweetsSources = topBy(retweets, 'retweeted_status.user.screen_name');
const favoriteSources = topBy(favorite, 'user.screen_name');

const reportTopRT = makeTable(
  `Top ${TOP_NB} ReTweeted User`,
  retweetsSources,
  { lastRowBold: false }
);

const reportTopFav = makeTable(
  `Top ${TOP_NB} Liked User`,
  favoriteSources,
  { lastRowBold: false }
);

/*
TODO
- Nb of tweets to read per day and their source (aka who's spamming my timeline)
*/

console.log(`${reportTitle}

${reportCount}

${reportTopRT}

${reportTopFav}
`);

