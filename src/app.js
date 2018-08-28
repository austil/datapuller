const { spawn } = require('child_process');
const logUpdate = require('log-update');
const _ = require('lodash');

const PULLERS = require('./pullers_const');

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

const handleMessage = (message) => {
  output[message.puller][message.step] = message.msg;
  if(message.status === PULLERS.STEP_STATUS.COMPLETE) {
    progress[message.puller] += 1; 
  }
};

const renderLine = puller => {
  const pullerKey = puller.NAME;
  if(_.has(output, pullerKey) === false) { return ''; }

  const isComplete = progress[pullerKey] >= _.size(puller.STEPS);

  const pullerStatus = isComplete ? '✔' : '~';
  const pullerProgress = progress[pullerKey] + '/' + _.size(puller.STEPS) + ' ';
  const pullerName =  puller.COLOR(_.capitalize(pullerKey + ' > '));
  const pullerValues = output[pullerKey].join(', ');
  return pullerStatus + ' ' + pullerProgress + pullerName + pullerValues;
};

const renderFrame = () => {
  const frame = _(ORDERED_PULLERS)
    .map(renderLine)
    .compact()
    .value()
    .join('\n');

  return frame;
};

logUpdate(renderFrame());

const pocket = spawn('node', [PULLERS.POCKET.PATH], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
const twitter = spawn('node', [PULLERS.TWITTER.PATH], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
const youtube = spawn('node', [PULLERS.YOUTUBE.PATH], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
const reddit = spawn('node', [PULLERS.REDDIT.PATH], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

pocket.on('message', (message) => {
  handleMessage(message);
  logUpdate(renderFrame());
});

twitter.on('message', (message) => {
  handleMessage(message);
  logUpdate(renderFrame());
});

youtube.on('message', (message) => {
  handleMessage(message);
  logUpdate(renderFrame());
});

reddit.on('message', (message) => {
  handleMessage(message);
  logUpdate(renderFrame());
});
