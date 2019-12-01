const PULLERS = require('./pullers_const');

console.log('PULLERS STATS\n');

[
  'POCKET',
  'TWITTER',
  'YOUTUBE',
  'REDDIT',
  'GITHUB'
].forEach(pullerKey => {
  const puller = PULLERS[pullerKey];
  const db = require('../' + puller.FILE);
  console.log(puller.COLOR(puller.NAME));
  Object.entries(db).forEach(([dbKey, dbValue]) => {
    if(Array.isArray(dbValue)) {
      console.log('- ' + dbKey + ': ' + dbValue.length);
    } else if (pullerKey === 'POCKET' && dbKey === 'archived') {
      console.log('- favorite: ' + dbValue.favorite.length);
      console.log('- others: ' + dbValue.others.length);
    }
  });
  console.log('last_pull: ' + new Date(db.last_pull * 1000));
  console.log('');
});


