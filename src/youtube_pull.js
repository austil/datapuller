const fs = require('fs');
const crypto = require('crypto');

// Npm dependencies
const _ = require('lodash');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const service = google.youtube('v3');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const cheerio = require('cheerio');

// Local dependencies
const {logger} = require('./helpers');
const auth = require('./auth_manager');
const youtubeAuth = require('./youtube_auth');
const config = require('./config_manager').youtube;

const {YOUTUBE: PULLER, STEP_STATUS} = require('./const');
const log = logger(PULLER);

const clientSecret = config.installed.client_secret;
const clientId = config.installed.client_id;
const redirectUrl = config.installed.redirect_uris[0];
const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

const STEPS = {
  LIKES: 0,
  FAVORITE: 1,
  HISTORY: 2
};

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);

db.defaults({
  likes: [],
  history: [],
  favorites: [],
  last_parse: {
    watch_history: ''
  }
}).write();

const getDefaultsPlaylists = (oauth2Client) => (new Promise((resolve, reject) => {
  const channelInfo = {
    auth: oauth2Client,
    mine: true,
    part: 'contentDetails'
  };

  service.channels.list(channelInfo, (err, res) => {
    if (err) {
      reject('The API returned an error: ' + err);
    }
    resolve(res.data.items[0].contentDetails.relatedPlaylists);
  });
}));

const getPlaylistItems = (params) => (new Promise((resolve, reject) => {
  service.playlistItems.list(params, (err, res) => {
    if (err) {
      reject('The API returned an error: ' + err);
    }
    resolve({items: res.data.items, nextPageToken: res.data.nextPageToken});
  });
}));

const pullAll = async (params, logger = log) => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull) {
    const data = await getPlaylistItems(params);
    
    if(params.sinceId) {
      const sinceItemIndex = data.items.findIndex(i => i.id === params.sinceId);
      if(sinceItemIndex >= 0) {
        data.items = data.items.slice(0, sinceItemIndex);
      }
    }
    
    if(data.items.length > 0) { logger({msg: `${dataSorted.length + data.items.length}`}); }
    
    dataSorted = data.items.reverse().concat(dataSorted);
    moreToPull = data.items.length >= params.maxResults;
    params.pageToken = data.nextPageToken;
  }

  return dataSorted;
};

const commonParams = {
  auth: oauth2Client,
  part: 'contentDetails,snippet',
  maxResults: 50
};

const puller = ({name, step, params, dbProps}) => {
  return async (sinceId) => {
    const llog = ({msg, status = STEP_STATUS.IN_PROGRESS}) => log({msg: name + ': ' + msg, status, step});
    const pullerParams = _.assign(params, commonParams);

    if(sinceId) {
      pullerParams.sinceId = sinceId;
      llog({msg: 'starting update'});
      const data = await pullAll(pullerParams, llog);
      db.update(dbProps, list => list.concat(data)).write();
      llog({msg: `${data.length}`, status: STEP_STATUS.COMPLETE});
    } 
    else {
      llog({msg: 'first pull'});
      const data = await pullAll(pullerParams, llog);
      db.set(dbProps, data).write();
      llog({msg: `${data.length}`, status: STEP_STATUS.COMPLETE});
    }
  };
};

const readFile = (file) => (new Promise((resolve, reject) => {
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
      reject(err);
    }
    resolve(data);
  });
}));

// Thx to https://stackoverflow.com/questions/18658612/obtaining-the-hash-of-a-file-using-the-stream-capabilities-of-crypto-module-ie
const checksumFile = function (algorithm, path) {
  return new Promise((resolve, reject) =>
    fs.createReadStream(path)
      .on('error', reject)
      .pipe(crypto.createHash(algorithm)
        .setEncoding('hex'))
      .once('finish', function () {
        resolve(this.read());
      })
  );
};

const parseHistory = async (lastParse) => {
  const historyFile = './drop_zone/watch-history.html';
  const llog = ({msg, status = STEP_STATUS.IN_PROGRESS}) => log({msg: 'History: ' + msg, status, step: STEPS.HISTORY});
  const hash = await checksumFile('md5', historyFile);

  if(lastParse && hash === lastParse) {
    llog({msg: 'unchanged file', status: STEP_STATUS.COMPLETE});
    return;
  }

  const parse = data => {
    llog({msg: 'parsing file'});
    const $ = cheerio.load(data);
    llog({msg: 'loaded in parser'});
    const videos = $('.mdl-grid .content-cell:nth-child(2)')
      .map((index, elem) => {
        const title = $(elem).find('a').get(0);
        const channel = $(elem).find('a').get(1);
        const date = $(elem).children().last().get(0).next.data;
        const video = {
          title: $(title).text(),
          videoLink: $(title).attr('href'),
          channel: $(channel).text(),
          channelLink: $(channel).attr('href'),
          date: date
        };
        if(index % 1000 === 0) {
          llog({msg: `${index}`});
        }
        return video;
      }).get();
    db.set('history', videos).write();
    llog({msg: `${videos.length}`, status: STEP_STATUS.COMPLETE});
  };

  await readFile(historyFile)
    .then(parse)
    .then(() => db.set('last_parse.watch_history', hash).write())
    .catch(() => llog({msg: 'no file' + ' ' + historyFile, status: STEP_STATUS.COMPLETE}));
};

(async () => {
  // Api tokens
  if(auth.has('youtube') === false) {
    log({msg: 'No access token found, lets get one'});
    await youtubeAuth.getAccess({oauth2Client, log});
  }
  oauth2Client.credentials = auth.get('youtube');
  log({msg: 'Ready !'});
  
  const playlists = await getDefaultsPlaylists(oauth2Client, service);

  const pullLikes = puller({
    name: 'Likes',
    step: STEPS.LIKES,
    params: {playlistId: playlists.likes},
    dbProps: 'likes'
  });
  
  const pullFavorites = puller({
    name: 'Favorites',
    step: STEPS.FAVORITE,
    params: {playlistId: playlists.favorites},
    dbProps: 'favorites'
  });

  const lastLike = db.get('likes').last().value();
  const lastFavorite = db.get('favorites').last().value();
  const lastHistoryParse = db.get('last_parse.watch_history').value();

  await Promise.all([
    pullLikes(lastLike ? lastLike.id : null),
    pullFavorites(lastFavorite ? lastFavorite.id : null),
  ]);
  parseHistory(lastHistoryParse);
})();
