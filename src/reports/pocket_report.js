const _ = require('lodash');
const sstats = require('simple-statistics');
const {makeTable, getDomainFromURL} = require('./report_utils');
const {POCKET} = require('../pullers_const');
const {unread, archived} = require('../../' + POCKET.FILE);

const reportTitle = POCKET.COLOR('Pocket Report');

const archivedArray = [...archived.favorite, ...archived.others];
const allArray = [ ...unread, ...archivedArray ];

// Simple at first, the detailled count of items
const reportCount = makeTable(
  'Items count',
  [
    ['Unread:', unread.length],
    ['Archived:', archivedArray.length],
    ['  Favorite:', archived.favorite.length],
    ['  Others:', archived.others.length],
    ['Total:', allArray.length],
  ]
);

// Word count stuff
const getWordCount = a => a.word_count ? parseInt(a.word_count) : 0;
const sumWordsUnread = _.sumBy(unread, getWordCount);
const sumWordsFavorite = _.sumBy(archived.favorite, getWordCount);
const sumWordsOthers = _.sumBy(archived.others, getWordCount);
const sumWordsRedTotal = sumWordsFavorite + sumWordsOthers;
const sumWordsTotal = sumWordsRedTotal + sumWordsUnread;

// Then the equivalent in reading time
// I'm using the average speed across 17 different languages, being 189(+-29) words per minute 
// according to https://en.wikipedia.org/wiki/Words_per_minute#Reading_and_comprehension
const WPM = 189;
const WPM_MARGIN = 29;
const LOWER_WPM_RATIO = (WPM - WPM_MARGIN) / WPM;
const UPPER_WPM_RATIO = (WPM + WPM_MARGIN) / WPM;

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

// Word count missing
const archivedWithoutWordCount = archivedArray.length - archivedArray.filter(e => getWordCount(e) > 0).length;
const missingWordCountRatio = archivedWithoutWordCount * 100 / archivedArray.length;
const reportMissingWordCount = `The word_count is missing on ${missingWordCountRatio.toFixed(2)}% of archived articles.`;

// Ratio favorite / archived
const favoriteRatio = archived.favorite.length * 100 / archivedArray.length;
const favoriteTimeRatio = sumWordsFavorite * 100 / sumWordsRedTotal;
const reportFavoriteRatio = `Favorites account for ${favoriteRatio.toFixed(2)}% of the total of 
articles red and ${favoriteTimeRatio.toFixed(2)}% of the total reading time.`;

// Stats about word count on favorite vs others (are long articles better ? is there a correlation ?)
const wordsFavorite = _.compact(archived.favorite.map(getWordCount));
const wordsOthers = _.compact(archived.others.map(getWordCount));
const archivedStats = array => [
  sstats.mean, sstats.standardDeviation, sstats.min, sstats.median, sstats.max
].map(fn => fn(array));

const reportArchivedStats = makeTable(
  'Archived Word Count (mean, sd, min, median, max)',
  [
    ['Favorite:', ...archivedStats(wordsFavorite) ],
    ['Others:', ...archivedStats(wordsOthers) ],
  ],
  { formatNumber: n => n.toFixed(1), lastRowBold: false }
);

const randomVarFavorite = archivedArray.filter(e => getWordCount(e) > 0).map(e => e.favorite === '1' ? 1 : 0);
const randomVarWords = [...wordsFavorite, ...wordsOthers];
const wordFavoriteCorrelation = sstats.sampleCorrelation(randomVarWords, randomVarFavorite);
const reportWordFavoriteCorrelation = `Correlation between word_count and favorite: ${wordFavoriteCorrelation.toFixed(3)}`;

// Top sources (all and favorites)
const TOP_NB = 10;
const getDomainsTop = _.flow(
  // not using lodash/fp, using partial too much
  _.partial(_.filter, _, i => _.isNil(i.resolved_url) === false),
  _.partial(_.map, _, i => getDomainFromURL(i.resolved_url).replace('www.', '')),
  _.countBy,
  _.toPairs,
  _.partial(_.sortBy, _, ([ , v]) => v),
  _.partial(_.takeRight, _, TOP_NB),
  _.reverse,
);

const reportTopSources = makeTable(
  `Top ${TOP_NB} Sources`,
  getDomainsTop(allArray),
  { lastRowBold: false }
);

const reportTopFavoriteSources = makeTable(
  `Top ${TOP_NB} Favorites Sources`,
  getDomainsTop(archived.favorite),
  { lastRowBold: false }
);

/*
TODO
- Most common word in title (all and favorites ?)
- Pace of adding article vs reading article
- Longest without any red and/or any added
*/

console.log(`${reportTitle}

${reportCount}

${reportTimeToRead}

${reportFavoriteRatio}

${reportArchivedStats}

${reportMissingWordCount}

${reportWordFavoriteCorrelation}

${reportTopSources}

${reportTopFavoriteSources}
`);
