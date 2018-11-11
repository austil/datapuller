const _ = require('lodash');
const {POCKET} = require('../pullers_const');
const {unread} = require('../../' + POCKET.FILE);
const {makeTable} = require('./report_utils');

const getWordCount = a => a.word_count ? parseInt(a.word_count) : 0;

const LONGEST_NB = 40;

const longest_articles = _(unread)
  .sortBy(getWordCount)
  .reverse()
  .take(LONGEST_NB * 2)
  .uniqBy('resolved_title')
  .take(LONGEST_NB)
  .value();

const reportTitle = POCKET.COLOR('Pocket - What to read next ?');

const reportLongestArticles = makeTable(
  `TOP ${LONGEST_NB} Longest Articles (title, words)`,
  longest_articles.map(a => ['- ' + a.resolved_title, a.word_count]),
  {lastRowBold: false }
);

console.log(`${reportTitle}

${reportLongestArticles}
`);
