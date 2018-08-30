const _ = require('lodash');
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
const wordsUnread = _.sumBy(unread, getWordCount);
const wordsFavorite = _.sumBy(archived.favorite, getWordCount);
const wordsOthers = _.sumBy(archived.others, getWordCount);
const wordsRedTotal = wordsFavorite + wordsOthers;
const wordsTotal = wordsRedTotal + wordsUnread;

const wordCountToTimeToRead = (wordCount) => {
  return (wordCount / WPM / 60).toFixed(0) + 'h';
};

const timeToReadInterval = (ttr) => {
  return [LOWER_WPM_RATIO * ttr, ttr, UPPER_WPM_RATIO * ttr].map(wordCountToTimeToRead);
};

const reportTimeToRead = makeTable(
  'Time to read (slow, average, fast)',
  [
    ['Unread:',  ...timeToReadInterval(wordsUnread)],
    ['Archived:',  ...timeToReadInterval(wordsRedTotal)],
    ['  Favorite:',  ...timeToReadInterval(wordsFavorite)],
    ['  Others:',  ...timeToReadInterval(wordsOthers)],
    ['Total:',  ...timeToReadInterval(wordsTotal)],
  ]
);

/*
TODO
- Ratio favorite / red
- Stats about word count on favorite vs others (are long articles better ?)
- Top sources (all and favorites)
- Most common word in title (all and favorites ?)
- Pace of adding article vs reading article
- Longest without any red and/or any added
*/

console.log(`${reportTitle}

${reportCount}

${reportTimeToRead}
`);
