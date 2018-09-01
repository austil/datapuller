const { spawn } = require('child_process');
const logUpdate = require('log-update');
const _ = require('lodash');

const { getPullerStatus } = require('./puller_status');
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
  const status = getPullerStatus(puller);
  output[puller.NAME] = [status];
  progress[puller.NAME] = status === PULLERS.PULLER_STATUS.READY ? 0 : -1;
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
  const isDisabled = progress[pullerKey] < 0;

  // Refactor this pls
  const pullerStatus = isDisabled ? '✕' : (isComplete ? '✔' : '~');
  const pullerProgress = (isDisabled ? '.' : progress[pullerKey]) + '/' + _.size(puller.STEPS) + ' ';
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

const logFreeze = (msg) => {
  logUpdate.clear();
  console.log(msg);
  logUpdate(renderFrame());
};

const pullersQueue = ORDERED_PULLERS.filter(p => getPullerStatus(p) === PULLERS.PULLER_STATUS.READY);

const spawnProcess = () => {
  const currentPuller = pullersQueue.shift();
  const process = spawn('node', [currentPuller.PATH], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

  process.on('message', (message) => {
    handleMessage(message);
    logUpdate(renderFrame());
  });

  process.stdout.on('data', (data) => {
    logFreeze(_.capitalize(currentPuller.NAME) + ': ' + data.toString());
  });

  process.stderr.on('data', (data) => {
    logFreeze(_.capitalize(currentPuller.NAME) + ': ' + data.toString());
  });

  process.on('exit', () => {
    if(pullersQueue.length > 0) {
      spawnProcess();
    }
  });
};

for(let n = 0; n < Math.min(PULLERS.MAX_CONCURENCY, pullersQueue.length); n++) {
  spawnProcess();
}
