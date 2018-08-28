// Npm dependencies
const _ = require('lodash');
const pocketWrapper = require('node-getpocket');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Local dependencies
const {logger} = require('../helpers');
const auth = require('../auth_manager');
const pocketAuth = require('./pocket_auth');
const config = require('../config_manager').pocket;

const {POCKET: PULLER, STEP_STATUS} = require('../pullers_const');
const {STEPS} = PULLER;
const log = logger(PULLER);
const pocket = new pocketWrapper(config);

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);
db.defaults(PULLER.DEFAULT_DB).write();

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

const pullAll = async (params, logger = log) => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull){
    const data = await pocketGet(params);
    if(data.length > 0) { logger({msg: `${dataSorted.length + data.length}`}); }
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

const puller = ({name, step, params, dbProps}) => {
  return async (since) => {
    const llog = ({msg, status = STEP_STATUS.IN_PROGRESS}) => log({msg: name + ': ' + msg, status, step});
    const pullerParams = _.assign(params, commonParams);

    if(since){
      params.since = since;
      llog({msg: 'starting update'});
      const data = await pullAll(pullerParams, llog);
      db.update(dbProps, list => list.concat(data)).write();
      llog({msg: `${data.length}`, status: STEP_STATUS.COMPLETE});
    }
    else {
      llog({msg: 'first pull'});
      const data = await pullAll(params, llog);
      db.set(dbProps, data).write();
      llog({msg: `${data.length}`, status: STEP_STATUS.COMPLETE});
    }
  };
};

const pullFavorite = puller({
  name: 'Favorite',
  step: STEPS.FAVORITE,
  params: {state: 'archive', favorite: 1},
  dbProps: 'archived.favorite'
});

const pullArchived = puller({
  name: 'Archived',
  step: STEPS.ARCHIVED,
  params: {state: 'archive', favorite: 0},
  dbProps: 'archived.others'
});

const pullUnread = puller({
  name: 'Unread',
  step: STEPS.UNREAD,
  params: {state: 'unread'},
  dbProps: 'unread'
});

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
  log({msg: `Articles read: ${difference}`, step: STEPS.POST_PROCESS, status: STEP_STATUS.COMPLETE});
};

// Main immediate function
(async () => {
  // Api tokens
  if(auth.has(PULLER.NAME) === false) {
    log({msg: 'No access token found, lets get one'});
    await pocketAuth.getAccess({pocket, config, log});
  }
  config.access_token = auth.get(PULLER.NAME).access_token;
  pocket.refreshConfig(config);
  log({msg: 'Ready !'});

  // Data Pull
  const since = db.get('last_pull').value();
  
  await Promise.all([
    pullFavorite(since),
    pullArchived(since),
    pullUnread(since)
  ]);
  
  removeArchivedUnread();
  db.set('last_pull', _.floor(_.now() / 1000)).write();
})();
