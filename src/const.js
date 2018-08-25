const chalk = require('chalk');

const PULLER_STATUS = {
  LOADING: 'LOADING',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  READY: 'READY'
};

const STEP_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED'
};

const POCKET = {
  NAME: 'pocket', // Key for diplay, auth cache, process message ID
  FILE: './db/pocket_db.json',
  COLOR: chalk.bold.magenta,
  STEPS: 4
};

const TWITTER = {
  NAME: 'twitter',
  FILE: './db/twitter_db.json',
  COLOR: chalk.bold.blue,
  STEPS: 2
};

const YOUTUBE = {
  NAME: 'youtube',
  FILE: './db/youtube_db.json',
  COLOR: chalk.bold.red,
  STEPS: 3
};

module.exports = {
  PULLER_STATUS,
  STEP_STATUS,
  POCKET,
  TWITTER,
  YOUTUBE
};