const { spawn } = require('child_process');
const logUpdate = require('log-update');
const _ = require('lodash');

const PULLERS = require('./const');

const ORDERED_PULLERS = [
  PULLERS.POCKET,
  PULLERS.YOUTUBE,
  PULLERS.TWITTER,
  PULLERS.REDDIT
];

const output = {}; // 'puller_name': []
const progress = {}; // 'puller_name': 0

ORDERED_PULLERS.forEach(puller => {
  output[puller.NAME] = ['Waiting'];
  progress[puller.NAME] = 0;
});

const renderLine = puller => {
  const pullerKey = puller.NAME;
  if(_.has(output, pullerKey) === false) { return ''; }

  const isComplete = progress[pullerKey] >= puller.STEPS;

  const pullerStatus = isComplete ? '✔' : '~';
  const pullerProgress = progress[pullerKey] + '/' + puller.STEPS + ' ';
  const pullerName =  puller.COLOR(_.capitalize(pullerKey + ' > '));
  const pullerValues = output[pullerKey].join(', ');
  return pullerStatus + ' ' + pullerProgress + pullerName + pullerValues;
};

const renderFrame = (message) => {
  if (message) {
    output[message.puller][message.step] = message.msg;
    if(message.status === PULLERS.STEP_STATUS.COMPLETE) {
      progress[message.puller] += 1; 
    }
  }

  const frame = _(ORDERED_PULLERS)
    .map(renderLine)
    .compact()
    .value()
    .join('\n');

  return frame;
};

logUpdate(renderFrame());

const pocket = spawn('node', ['./src/pocket_pull.js'], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
const twitter = spawn('node', ['./src/twitter_pull.js'], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
const youtube = spawn('node', ['./src/youtube_pull.js'], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
const reddit = spawn('node', ['./src/reddit_pull.js'], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

pocket.on('message', (message) => {
  logUpdate(renderFrame(message));
});

twitter.on('message', (message) => {
  logUpdate(renderFrame(message));
});

youtube.on('message', (message) => {
  logUpdate(renderFrame(message));
});

reddit.on('message', (message) => {
  logUpdate(renderFrame(message));
});
