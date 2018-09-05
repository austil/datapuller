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

// Nb of tweets to read per hour and their source (aka who's spamming my timeline)
const dayHourKey = tweet => {
  const d = new Date(tweet.created_at);
  return `${d.getDay()}@${d.getHours()}h`;
};
const timelinePerDayHour = _(timeline_sample)
  .groupBy(dayHourKey)
  .toPairs()
  .tail() // remove first and last cause incomplete
  .initial()
  .map(([k, items]) => [k, items.length])
  .value();

const timelineHourAverage = sstats.mean(timelinePerDayHour.map(([ , nb]) => nb)).toFixed(2);
const reportTimelinePerHour = `Your home timeline is updated at an average of ${timelineHourAverage} tweets 
per hour (based on the last ${timeline_sample.length} tweets in your timeline).`;

console.log(`${reportTitle}

${reportCount}

${reportTopRT}

${reportTopFav}

${reportTimelinePerHour}
`);

