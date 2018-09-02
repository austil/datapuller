const chalk = require('chalk');
const _ = require('lodash');

const removeAnsiCodes = s => s.replace(/\u001b\[.*?m/g, ''); // eslint-disable-line

const formatCell = (value, formatNumber, index = 0, maxSize = 0) => {
  const cellContent = _.isNumber(value) ? formatNumber(value) : value;
  return index === 0 ? _.padEnd(cellContent, maxSize) : _.padStart(cellContent, maxSize); 
};

const makeTable = (title, data, { formatNumber = _.identity, lastRowBold = true } = {}) => {
  const columnsWidth = _.zip(...data).map(column => _.max(column.map(e => formatCell(e, formatNumber).length)));
  const rows = data.map((row, rowIndex) => {
    const rowString = row.map((e, columnIndex) => {
      return formatCell(e, formatNumber, columnIndex, columnsWidth[columnIndex]);
    }).join('  ');
    return rowIndex === data.length - 1 && lastRowBold ? chalk.bold(rowString) : rowString;
  });
  const largestRow = _.max(rows.map(r => removeAnsiCodes(r).length));
  
  const header = chalk.bold(title);
  const line = _.repeat('-', _.max([largestRow, title.length]) + 1);
  const body = rows.join('\n');
  return `${header}\n${line}\n${body}`;
};

const getDomainFromURL = (url) => {
  const matches = url.match(/^https?:\/\/([^/:?#]+)(?:[/:?#]|$)/i);
  return matches ? matches[1] : '';
};

module.exports = {
  makeTable,
  getDomainFromURL
};
