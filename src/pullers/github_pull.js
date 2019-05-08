// Npm dependencies
const _ = require('lodash');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Octokit = require('@octokit/rest');

// Local dependencies
const {logger} = require('../helpers');
const config = require('../config_manager').github;

const {GITHUB: PULLER, STEP_STATUS} = require('../pullers_const');
const {STEPS} = PULLER;
const log = logger(PULLER);
const octokit = new Octokit({ auth: config.personal_access_token });

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);
db.defaults(PULLER.DEFAULT_DB).write();

// Data puller
const pullAllStars = async () => {
  log({msg: 'Stars: fetch all started', status: STEP_STATUS.IN_PROGRESS, step: STEPS.STARRED});
  const starred = await octokit.paginate(
    octokit.activity.listReposStarredByUser.endpoint.merge({
      username: config.username,
      per_page: 100
    })
  );
  db.set('starred', starred).write();
  log({msg: `Stars: ${starred.length}`, status: STEP_STATUS.COMPLETE, step: STEPS.STARRED});
};

(async () => {
  log({msg: 'Ready !'});
  await pullAllStars();
  db.set('last_pull', _.floor(_.now() / 1000)).write();
})().catch(err => { console.log(err); });
