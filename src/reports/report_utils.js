const chalk = require('chalk');
const _ = require('lodash');

const removeAnsiCodes = s => s.replace(/\u001b\[.*?m/g, ''); // eslint-disable-line

const formatCell = (cell, index, maxSize) => {
  return index === 0 ? _.padEnd(cell, maxSize) : _.padStart(cell, maxSize); 
};

const makeTable = (title, data) => {
  const columnsWidth = _.zip(...data).map(column => _.max(column.map(e => e.toString().length)));
  const rows = data.map((row, rowIndex) => {
    const rowString = row.map((e, columnIndex) => formatCell(e, columnIndex, columnsWidth[columnIndex])).join('  ');
    return rowIndex === data.length - 1 ? chalk.bold(rowString) : rowString;
  });
  const largestRow = _.max(rows.map(r => removeAnsiCodes(r).length));
  
  const header = chalk.bold(title);
  const line = _.repeat('-', largestRow + 1);
  const body = rows.join('\n');
  return `${header}\n${line}\n${body}`;
};

module.exports = {
  makeTable
};
