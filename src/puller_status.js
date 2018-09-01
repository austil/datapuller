const _ = require('lodash');
const config = require('./config_manager');
const auth = require('./auth_manager');
const { PULLER_STATUS } = require('./pullers_const');

const getPullerStatus = (puller) => {
  if(_.isNil(config[puller.NAME]) || _.some(config[puller.NAME], _.isNil)) {
    return PULLER_STATUS.NOT_CONFIGURED;
  }
  if(puller.AUTH && auth.has(puller.NAME)=== false) {
    return PULLER_STATUS.NOT_INITIALIZED;
  }
  return PULLER_STATUS.READY;
};

module.exports = {
  getPullerStatus
};
