const fs = require('fs');
const crypto = require('crypto');

// Npm dependencies
const _ = require('lodash');
const chalk = require('chalk');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const service = google.youtube('v3');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const cheerio = require('cheerio');

// Local dependencies
const auth = require('./auth_manager');
const youtubeAuth = require('./youtube_auth');
const config = require('../config.js').youtube;

const log = msg => console.log(chalk.red.bold(' Youtube > ') + msg);

const clientSecret = config.installed.client_secret;
const clientId = config.installed.client_id;
const redirectUrl = config.installed.redirect_uris[0];
const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

// Database
const adapter = new FileSync('./db/youtube_db.json');
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

const pullAll = async (oauth2Client, params, name = 'videos') => {
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
    
    if(data.items.length > 0) { log(`${dataSorted.length + data.items.length} ${name} pulled`); }
    
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

const pullLikes = async (playlists, sinceId) => {
  const params = _.assign({playlistId: playlists.likes}, commonParams);
  if(sinceId) {
    params.sinceId = sinceId;
    log(chalk.bold('Updating') + ' likes');
    const likes = await pullAll(oauth2Client, params, 'likes');
    db.update('likes', list => list.concat(likes)).write();
    log(chalk.bold('Likes update finished') + `, ${likes.length} items total`);
  } 
  else {
    log(chalk.bold('Pulling all') + ' likes');
    const likes = await pullAll(oauth2Client, params, 'likes');
    db.set('likes', likes).write();
    log(chalk.bold('First likes pull finished') + `, ${likes.length} items total`);
  }
};

const pullFavorites = async (playlists, sinceId) => {
  const params = _.assign({playlistId: playlists.favorites}, commonParams);
  if(sinceId) {
    params.sinceId = sinceId;
    log(chalk.bold('Updating') + ' favorites');
    const favorites = await pullAll(oauth2Client, params, 'favorites');
    db.update('favorites', list => list.concat(favorites)).write();
    log(chalk.bold('Favorites update finished') + `, ${favorites.length} items total`);
  } 
  else {
    log(chalk.bold('Pulling all') + ' favorites');
    const favorites = await pullAll(oauth2Client, params, 'favorites');
    db.set('favorites', favorites).write();
    log(chalk.bold('First favorites pull finished') + `, ${favorites.length} items total`);
  }
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
  const hash = await checksumFile('md5', historyFile);
  if(lastParse && hash === lastParse) {
    log(chalk.bold('Same history file') + `, no need to parse ${historyFile}`);
    return;
  }

  const parse = data => {
    log(chalk.bold('Parsing history file') + ' ' + historyFile);
    const $ = cheerio.load(data);
    log('File watch-history.html loaded in the parser');
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
          log(`Parsing watch-history.html : ${index} videos`);
        }
        return video;
      }).get();
    db.set('history', videos).write();
    log(chalk.bold('History file parse finished') + `, ${videos.length} videos`);
  };

  await readFile(historyFile)
    .then(parse)
    .then(() => db.set('last_parse.watch_history', hash).write())
    .catch(() => log(chalk.bold('No file') + ' ' + historyFile));
};

(async () => {
  // Api tokens
  if(auth.has('youtube') === false) {
    log('No access token found, lets get one');
    await youtubeAuth.getAccess({oauth2Client, log});
  }
  oauth2Client.credentials = auth.get('youtube');
  log('Ready !');
  
  const playlists = await getDefaultsPlaylists(oauth2Client, service);

  const lastLike = db.get('likes').last().value();
  const lastFavorite = db.get('favorites').last().value();
  const lastHistoryParse = db.get('last_parse.watch_history').value();

  await Promise.all([
    pullLikes(playlists, lastLike ? lastLike.id : null),
    pullFavorites(playlists, lastFavorite ? lastFavorite.id : null),
  ]);
  parseHistory(lastHistoryParse);
})();
