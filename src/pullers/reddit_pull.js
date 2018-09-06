// Npm dependencies
const _ = require('lodash');
const snoowrap = require('snoowrap');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Local dependencies
const {logger} = require('../helpers');
const config = require('../config_manager').reddit;

const {REDDIT: PULLER, STEP_STATUS} = require('../pullers_const');
const {STEPS} = PULLER;
const log = logger(PULLER);
const reddiy = new snoowrap(config);

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);
db.defaults(PULLER.DEFAULT_DB).write();

// Data puller
const pullUpvoted = async () => {
  log({msg: 'Upvoted: fetch all started', status: STEP_STATUS.IN_PROGRESS, step: STEPS.UPVOTED});
  const upvoted = await reddiy.getMe().getUpvotedContent().fetchAll();
  db.set('upvoted', upvoted).write();
  log({msg: `Upvoted: ${upvoted.length}`, status: STEP_STATUS.COMPLETE, step: STEPS.UPVOTED});
};

const pullSaved = async () => {
  log({msg: 'Saved: fetch all started', status: STEP_STATUS.IN_PROGRESS, step: STEPS.SAVED});
  const saved = await reddiy.getMe().getSavedContent().fetchAll();
  db.set('saved', saved).write();
  log({msg: `Saved: ${saved.length}`, status: STEP_STATUS.COMPLETE, step: STEPS.SAVED});
};

(async () => {
  log({msg: 'Ready !'});
  await Promise.all([
    pullUpvoted(),
    pullSaved(),
  ]);
  db.set('last_pull', _.floor(_.now() / 1000)).write();
})().catch(err => { console.log(err); });
