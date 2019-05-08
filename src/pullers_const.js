const chalk = require('chalk');

const MAX_CONCURENCY = 3;

const PULLER_STATUS = {
  NOT_CONFIGURED: 'Not Configured', // api credentials missing
  NOT_INITIALIZED: 'Not Initialized', // api tokens missing
  READY: 'Ready'
};

const STEP_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED'
};

const POCKET = {
  NAME: 'pocket', // Key for diplay, config, auth cache, process message ID
  FILE: './db/pocket_db.json',
  COLOR: chalk.bold.magenta,
  PATH: './src/pullers/pocket_pull.js',
  AUTH: true,
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
  AUTH: false,
  STEPS: {
    FAVORITE: 0,
    TWEETS: 1,
    TIMELINE: 2,
  },
  DEFAULT_DB: {
    tweets: [],
    favorite: [],
    timeline_sample: [],
    last_pull: ''
  }
};

const YOUTUBE = {
  NAME: 'youtube',
  FILE: './db/youtube_db.json',
  COLOR: chalk.bold.red,
  PATH: './src/pullers/youtube_pull.js',
  AUTH: true,
  STEPS: {
    LIKES: 0,
    FAVORITE: 1,
    HISTORY: 2
  },
  DEFAULT_DB: {
    likes: [],
    history: [],
    favorites: [],
    categories: [],
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
  AUTH: false,
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

const GITHUB = {
  NAME: 'github',
  FILE: './db/github_db.json',
  COLOR: chalk.bold.gray,
  PATH: './src/pullers/github_pull.js',
  AUTH: false,
  STEPS: {
    STARRED: 0,
  },
  DEFAULT_DB: {
    starred: [],
    last_pull: ''
  }
};

module.exports = {
  MAX_CONCURENCY,
  PULLER_STATUS,
  STEP_STATUS,
  POCKET,
  TWITTER,
  YOUTUBE,
  REDDIT,
  GITHUB
};
