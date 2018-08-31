const _ = require('lodash');
const sstats = require('simple-statistics');
const {makeTable} = require('./report_utils');
const {POCKET} = require('../pullers_const');
const {unread, archived} = require('../../' + POCKET.FILE);

const reportTitle = POCKET.COLOR('Pocket Report');

// Simple at first, the detailled count of items
const redCountTotal = archived.favorite.length + archived.others.length;
const countTotal = unread.length + redCountTotal;

const reportCount = makeTable(
  'Items count',
  [
    ['Unread:', unread.length],
    ['Archived:', redCountTotal],
    ['  Favorite:', archived.favorite.length],
    ['  Others:', archived.others.length],
    ['Total:', countTotal],
  ]
);

// Then the equivalent in reading time
// I'm using the average speed across 17 different languages, being 189(+-29) words per minute 
// according to https://en.wikipedia.org/wiki/Words_per_minute#Reading_and_comprehension
const WPM = 189;
const WPM_MARGIN = 29;
const LOWER_WPM_RATIO = (WPM - WPM_MARGIN) / WPM;
const UPPER_WPM_RATIO = (WPM + WPM_MARGIN) / WPM;

const getWordCount = a => a.word_count ? parseInt(a.word_count) : 0;
const sumWordsUnread = _.sumBy(unread, getWordCount);
const sumWordsFavorite = _.sumBy(archived.favorite, getWordCount);
const sumWordsOthers = _.sumBy(archived.others, getWordCount);
const sumWordsRedTotal = sumWordsFavorite + sumWordsOthers;
const sumWordsTotal = sumWordsRedTotal + sumWordsUnread;

const wordCountToTimeToRead = (wordCount) => {
  return (wordCount / WPM / 60).toFixed(0) + 'h'; // only in hour, need improvment
};

const timeToReadInterval = (ttr) => {
  return [LOWER_WPM_RATIO * ttr, ttr, UPPER_WPM_RATIO * ttr].map(wordCountToTimeToRead);
};

const reportTimeToRead = makeTable(
  'Time to read (slow, average, fast)',
  [
    ['Unread:',  ...timeToReadInterval(sumWordsUnread)],
    ['Archived:',  ...timeToReadInterval(sumWordsRedTotal)],
    ['  Favorite:',  ...timeToReadInterval(sumWordsFavorite)],
    ['  Others:',  ...timeToReadInterval(sumWordsOthers)],
    ['Total:',  ...timeToReadInterval(sumWordsTotal)],
  ]
);

// Ratio favorite / red
const favoriteRatio = archived.favorite.length * 100 / redCountTotal;
const favoriteTimeRatio = sumWordsFavorite * 100 / sumWordsRedTotal;
const reportFavoriteRatio = `Favorites account for ${favoriteRatio.toFixed(2)}% of the total of 
articles red and ${favoriteTimeRatio.toFixed(2)}% of the total reading time.`;

// Stats about word count on favorite vs others (are long articles better ? is there a correlation ?)
const wordsFavorite = _.compact(archived.favorite.map(getWordCount));
const wordsOthers = _.compact(archived.others.map(getWordCount));
const redStast = array => [
  sstats.mean, sstats.standardDeviation, sstats.min, sstats.median, sstats.max
].map(fn => fn(array));

const reportRedStats = makeTable(
  'Article stats (mean, sd, min, median, max)',
  [
    ['Favorite:', ...redStast(wordsFavorite) ],
    ['Others:', ...redStast(wordsOthers) ],
  ],
  { formatNumber: n => n.toFixed(1), lastRowBold: false }
);

const randomVarFavorite = [...archived.favorite, ...archived.others]
  .filter(e => getWordCount(e) > 0)
  .map(e => e.favorite === '1' ? 1 : 0);
const randomVarWords = [...wordsFavorite, ...wordsOthers];
const wordFavoriteCorrelation = sstats.sampleCorrelation(randomVarWords, randomVarFavorite);
const reportWordFavoriteCorrelation = `Correlation between word_count and favorite: ${wordFavoriteCorrelation.toFixed(3)}`;

/*
TODO
- Number/percentage of articles without a word_count
- Top sources (all and favorites)
- Most common word in title (all and favorites ?)
- Pace of adding article vs reading article
- Longest without any red and/or any added
*/

console.log(`${reportTitle}

${reportCount}

${reportTimeToRead}

${reportFavoriteRatio}

${reportRedStats}

${reportWordFavoriteCorrelation}
`);
