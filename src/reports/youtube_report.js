const _ = require('lodash');
const sstats = require('simple-statistics');
const {makeTable} = require('./report_utils');
const {YOUTUBE} = require('../pullers_const');
const {likes, history, favorites, categories} = require('../../' + YOUTUBE.FILE);

const reportTitle = YOUTUBE.COLOR('Youtube Report');

// Simple at first, the detailled count of items
const reportCount = makeTable(
  'Items count',
  [
    ['Watched:', _.uniqBy(history, 'id').length],
    ['Liked:', likes.length],
    ['Favorites:', favorites.length],
  ],
  { lastRowBold: false }
);

// Most watched categories
const TOP_CAT = 10;
const categoriesMap = _(categories)
  .map(cat => [cat.id, cat.snippet.title])
  .fromPairs()
  .value();

const categoriesCount = _(history)
  .groupBy('snippet.categoryId')
  .toPairs()
  .map(([catId, v]) => [categoriesMap[catId], v.length])
  .sortBy(([ , nb]) => nb)
  .takeRight(TOP_CAT)
  .reverse()
  .value();

const reportCategoriesCount = makeTable(
  `Top ${TOP_CAT} categories watched`,
  categoriesCount,
  { lastRowBold: false }
);

// Languages
// /!\ A lot of videos have an undefined default language
const TOP_LANG = 6;
const watchedWithLangDefined = _.filter(history, 'snippet.defaultAudioLanguage');
const languagesCount = _(watchedWithLangDefined)
  .groupBy('snippet.defaultAudioLanguage')
  .toPairs()
  .map(([lang, v]) => [lang, v.length, (v.length * 100 / watchedWithLangDefined.length).toFixed(2) + '%'])
  .sortBy(([ , nb]) => nb)
  .takeRight(TOP_LANG)
  .reverse()
  .value();

const reportLanguageCount = makeTable(
  `Top ${TOP_LANG} languages`,
  languagesCount,
  { lastRowBold: false }
);

/**
 * TODO
 * - Videos watched several times
 * - Ratio watched / likes
 * - Most watched/liked channels
 * - Total duration
 * - Video liked with the lowest view count
 */

console.log(`${reportTitle}

${reportCount}

${reportCategoriesCount}

${reportLanguageCount}
`);
