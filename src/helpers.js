const _ = require('lodash');
const chalk = require('chalk');
const {STEP_STATUS} = require('./const');

const logger = (puller) => {
  return ({msg, status = STEP_STATUS.IN_PROGRESS, step = 0}) => {
    if(process.connected) {
      process.send({
        puller: puller.NAME,
        step: step,
        msg: msg,
        status: status
      });
    }
    else {
      const check = status === STEP_STATUS.COMPLETE ? chalk.green.bold(' ✔') : '';
      console.log(puller.COLOR(_.capitalize(puller.NAME + ' > ')) + msg + check);
    }
  };
};

module.exports = {
  logger
};
