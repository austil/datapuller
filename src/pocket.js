// Node dependencies
const readline = require('readline');

// Npm dependencies
const _ = require('lodash');
const pocketWrapper = require('node-getpocket');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const chalk = require('chalk');

// Local dependencies
const config = require('../config.js').pocket;

const log = msg => console.log(chalk.magenta.bold(' Pocket > ') + msg);
const pocket = new pocketWrapper(config);

// Database
const adapter = new FileSync('./db/pocket_db.json');
const db = low(adapter);

db.defaults({ 
  access_token: '',
  archived: {
    favorite: [],
    others: []
  },
  unread: [],
  last_pull: ''
}).write();

// Api Token
const getRequestToken = () => (new Promise((resolve, reject) => {
  pocket.getRequestToken(config, (err, resp, body) => {
    if (err) { 
      reject('Get request token failed ' + JSON.stringify(err)); 
    }
    else {
      const json = JSON.parse(body);
      resolve(json.code);
    }
  });
}));

const authorizeApp = () => (new Promise((resolve) => {
  log(`Authorize this app at : ${pocket.getAuthorizeURL(config)}`);
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  rl.question('Press enter to continue when you\'re done ', () => {
    rl.close();
    resolve();
  });
}));

const getAccesstoken = () => (new Promise((resolve, reject) => {
  pocket.getAccessToken(config, (err, resp, body) => {
    if (err) {
      reject('Get access token failed ' + JSON.stringify(err));
    }
    else {
      const json = JSON.parse(body);
      resolve(json.access_token);
    }
  });
}));

const getAccess = () => {
  return getRequestToken()
    .then(requestToken => {
      config.request_token = requestToken;
      log(`Request token : ${requestToken}`);
    })
    .then(authorizeApp)
    .then(getAccesstoken)
    .then(accessToken => {
      db.set('access_token', accessToken).write();
      log(`Access token : ${accessToken}`);
    })
    .catch(err => log(err));
};

// Data puller
const pocketGet = (params) => (new Promise((resolve, reject) => {
  pocket.get(params, (err, resp) => {
    if(err) {
      reject('Pull failed ' + JSON.stringify(err));    
    }
    else {
      const list = _.map(resp.list);
      resolve(list);
    }
  });
}));

const pullAll = async (params, name = 'items') => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull){
    const data = await pocketGet(params);
    if(data.length > 0) { log(`${dataSorted.length + data.length} ${name} pulled`); }
    dataSorted = _(data).sortBy('time_favorited').concat(dataSorted).value();
    moreToPull = data.length >= params.count;
    params.offset += params.count;
  }
  return dataSorted;
};

const commonParams = {
  sort: 'newest',
  count: 200,
  detailType: 'complete',
  offset: 0
};

const pullFavorite = async (since) => {
  const params = _.assign({state: 'archive', favorite: 1}, commonParams);
  if(since){
    params.since = since;
    log(chalk.bold('Updating') + ' favorite');
    const favorite = await pullAll(params, 'favorite');
    db.update('archived.favorite', list => list.concat(favorite)).write();
    log(chalk.bold('Favorite update finished') + `, ${favorite.length} items total`);
  }
  else {
    log(chalk.bold('Pulling all') + ' favorite');
    const favorite = await pullAll(params, 'favorite');
    db.set('archived.favorite', favorite).write();
    log(chalk.bold('First favorite pull finished') + `, ${favorite.length} items total`);
  }
};

const pullArchived = async (since) => {
  const params = _.assign({state: 'archive', favorite: 0}, commonParams);
  if(since){
    params.since = since;
    log(chalk.bold('Updating') + ' archived');
    const archived = await pullAll(params, 'archived');
    db.update('archived.others', list => list.concat(archived)).write();
    log(chalk.bold('Archived update finished') + `, ${archived.length} items total`);
  }
  else {
    log(chalk.bold('Pulling all') + ' archived');
    const archived = await pullAll(params, 'archived');
    db.set('archived.others', archived).write();
    log(chalk.bold('First archived pull finished') + `, ${archived.length} items total`);
  }
};

const pullUnread = async (since) => {
  const params = _.assign({state: 'unread'}, commonParams);
  if(since){
    params.since = since;
    log(chalk.bold('Updating') + ' unread');
    const unread = await pullAll(params, 'unread');
    db.update('unread', list => list.concat(unread)).write();
    log(chalk.bold('Unread update finished') + `, ${unread.length} items total`);
  }
  else {
    log(chalk.bold('Pulling all') + ' unread');
    const unread = await pullAll(params, 'unread');
    db.set('unread', unread).write();
    log(chalk.bold('First unread pull finished') + `, ${unread.length} items total`);
  }
};

const removeArchivedUnread = () => {
  const unread = db.get('unread').value();
  const archived = db.get('archived').value();

  const archivedItemIds = _.chain(archived.favorite)
    .concat(archived.others)
    .map('item_id')
    .value();

  const archivedItemIdsSet = new Set(archivedItemIds);
  
  const unreadWithoutArchived = unread.filter(article => !archivedItemIdsSet.has(article.item_id));
  db.set('unread', unreadWithoutArchived).write();
  
  const difference = unread.length - unreadWithoutArchived.length;
  log(`${difference} articles read since last update`);
};

// Main immediate function
(async () => {
  // Api tokens
  if(db.get('access_token').value().length === 0) {
    log('No access token found, lets get one');
    await getAccess();
  }
  config.access_token = db.get('access_token').value();
  pocket.refreshConfig(config);
  log('Ready !');

  // Data Pull
  const since = db.get('last_pull').value();
  db.set('last_pull', _.floor(_.now() / 1000)).write();
  
  await Promise.all([
    pullFavorite(since),
    pullArchived(since),
    pullUnread(since)
  ]);

  removeArchivedUnread();
})();
