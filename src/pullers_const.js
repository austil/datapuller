const chalk = require('chalk');

const PULLER_STATUS = {
  NOT_CONFIGURED: 'NOT_CONFIGURED', // api credentials missing
  NOT_INITIALIZED: 'NOT_INITIALIZED', // api tokens missing
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
  PATH: './src/pullers/pocket_pull.js',
  STEPS: {
    FAVORITE: 0,
    ARCHIVED: 1,
    UNREAD: 2,
    POST_PROCESS: 3
  },
  DEFAULT_DB: {
    archived: {
      favorite: [],
      others: []
    },
    unread: [],
    last_pull: ''
  }
};

const TWITTER = {
  NAME: 'twitter',
  FILE: './db/twitter_db.json',
  COLOR: chalk.bold.blue,
  PATH: './src/pullers/twitter_pull.js',
  STEPS: {
    FAVORITE: 0,
    TWEETS: 1
  },
  DEFAULT_DB: {
    tweets: [],
    favorite: [],
    last_pull: ''
  }
};

const YOUTUBE = {
  NAME: 'youtube',
  FILE: './db/youtube_db.json',
  COLOR: chalk.bold.red,
  PATH: './src/pullers/youtube_pull.js',
  STEPS: {
    LIKES: 0,
    FAVORITE: 1,
    HISTORY: 2
  },
  DEFAULT_DB: {
    likes: [],
    history: [],
    favorites: [],
    last_pull: '',
    last_parse: {
      watch_history: ''
    }
  }
};

const REDDIT = {
  NAME: 'reddit',
  FILE: './db/reddit_db.json',
  COLOR: chalk.bold.yellow,
  PATH: './src/pullers/reddit_pull.js',
  STEPS: {
    UPVOTED: 0,
    SAVED: 1
  },
  DEFAULT_DB: {
    upvoted: [],
    saved: [],
    last_pull: ''
  }
};

module.exports = {
  PULLER_STATUS,
  STEP_STATUS,
  POCKET,
  TWITTER,
  YOUTUBE,
  REDDIT
};
