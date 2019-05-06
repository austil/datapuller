// Node dependencies
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
const {logger} = require('../helpers');
const auth = require('../auth_manager');
const youtubeAuth = require('./youtube_auth');
const config = require('../config_manager').youtube;

const {YOUTUBE: PULLER, STEP_STATUS} = require('../pullers_const');
const {STEPS} = PULLER;
const log = logger(PULLER);

const clientSecret = config.installed.client_secret;
const clientId = config.installed.client_id;
const redirectUrl = config.installed.redirect_uris[0];
const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

// Database
const adapter = new FileSync(PULLER.FILE);
const db = low(adapter);
db.defaults(PULLER.DEFAULT_DB).write();

const getDefaultsPlaylists = (oauth2Client) => (new Promise((resolve, reject) => {
  const channelInfo = {
    auth: oauth2Client,
    mine: true,
    part: 'contentDetails'
  };
  service.channels.list(channelInfo, (err, res) => {
    if (err) {
      reject('The channels API returned an error: ' + err);
    } else {
      resolve(res.data.items[0].contentDetails.relatedPlaylists);
    }
  });
}));

const getCategories = (oauth2Client) => (new Promise((resolve, reject) => {
  const categoriesParams = {
    auth: oauth2Client,
    part: 'snippet',
    regionCode: 'US'
  };
  service.videoCategories.list(categoriesParams, (err, res) => {
    if (err) {
      reject('The videoCategories API returned an error: ' + err);
    } else {
      resolve(res.data.items);
    }
  });
}));

const getPlaylistItems = (params) => (new Promise((resolve, reject) => {
  service.playlistItems.list(params, (err, res) => {
    if (err) {
      reject('The playlistItems API returned an error: ' + err);
    } else {
      resolve({items: res.data.items, nextPageToken: res.data.nextPageToken});
    }
  });
}));

const getVideosList = (params) => (new Promise((resolve, reject) => {
  service.videos.list(params, (err, res) => {
    if (err) {
      reject('The videos API returned an error: ' + err);
    } else {
      resolve(res.data.items);
    }
  });
}));

const pullAllIdsFromPlaylist = async (params, logger = log) => {
  let moreToPull = true;
  let dataSorted = [];

  while(moreToPull) {
    const data = await getPlaylistItems(params);
    
    if(params.sinceId) {
      const sinceItemIndex = data.items.findIndex(i => i.snippet.resourceId.videoId === params.sinceId);
      if(sinceItemIndex >= 0) {
        data.items = data.items.slice(0, sinceItemIndex);
        moreToPull = false;
      }
    }
    
    if(data.items.length > 0) { logger({msg: `${dataSorted.length + data.items.length}`}); }
    
    dataSorted = data.items.reverse().concat(dataSorted);
    moreToPull = moreToPull && data.nextPageToken !== undefined;
    params.pageToken = data.nextPageToken;
  }

  return dataSorted.map(i => i.snippet.resourceId.videoId);
};

const pullAllVideos = async (videosIds, params, logger = log) => {
  const idsChunks = _(videosIds)
    .chunk(params.maxResults)
    .map(c => _.join(c, ',') )
    .value();
  let enrichedVideos = [];
  for(const ids of idsChunks) {
    const videosList = await getVideosList(_.assign({id: ids}, params));
    enrichedVideos = enrichedVideos.concat(videosList);
    logger({msg: `${enrichedVideos.length}/${videosIds.length} (max)`});
  }
  return enrichedVideos;
};

const commonParams = {
  auth: oauth2Client,
  part: 'id,snippet',
  maxResults: 50
};
const videoRessourceParams = {
  part: 'id,snippet,contentDetails,status,statistics'
};

const puller = ({name, step, params, dbProps}) => {
  return async (sinceId) => {
    const llog = ({msg, status = STEP_STATUS.IN_PROGRESS}) => log({msg: name + ': ' + msg, status, step});
    const playlistPullerParams = _.assign({}, params, commonParams);
    const videoPullerParams = _.assign({}, params, commonParams, videoRessourceParams);

    if(sinceId) {
      playlistPullerParams.sinceId = sinceId;
      llog({msg: 'starting update'});
      const ids = await pullAllIdsFromPlaylist(playlistPullerParams, llog);
      const data = await pullAllVideos(ids, videoPullerParams, llog);
      db.update(dbProps, list => list.concat(data)).write();
      llog({msg: `${data.length}`, status: STEP_STATUS.COMPLETE});
    } 
    else {
      llog({msg: 'first pull'});
      const ids = await pullAllIdsFromPlaylist(playlistPullerParams, llog);
      const data = await pullAllVideos(ids, videoPullerParams, llog);
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

  try {
    const hash = await checksumFile('md5', historyFile);
    if(lastParse && hash === lastParse) {
      llog({msg: 'unchanged file', status: STEP_STATUS.COMPLETE});
      return;
    }
  } catch (error) {
    llog({msg: 'no file' + ' ' + historyFile, status: STEP_STATUS.COMPLETE})
    return;
  }

  let $;

  const parseVideoId = (index, elem) => {
    const title = $(elem).find('a').get(0);
    if(title === undefined) {
      return null; // deleted video
    }
    const videoId = $(title).attr('href').split('?v=')[1];
    if(index % 1000 === 0) {
      llog({msg: `parsing ${index}`});
    }
    return videoId;
  };

  const parse = data => {
    llog({msg: 'parsing file'});
    $ = cheerio.load(data);
    llog({msg: 'loaded in parser'});
    const videosIds = _.compact($('.mdl-grid .content-cell:nth-child(2)').map(parseVideoId).get());
    llog({msg: `parsed ${videosIds.length} videos`});
    return videosIds;
  };

  const save = videos => {
    db.set('history', videos).write();
    llog({msg: `${videos.length}`, status: STEP_STATUS.COMPLETE});
  };

  const videoPullerParams = _.assign({}, commonParams, videoRessourceParams);

  await readFile(historyFile)
    .catch(() => llog({msg: 'no file' + ' ' + historyFile, status: STEP_STATUS.COMPLETE}))
    .then(parse)
    .then(_.partial(pullAllVideos, _, videoPullerParams, llog))
    .then(save)
    .then(() => db.set('last_parse.watch_history', hash).write())
    .catch(err => console.error(err));
};

(async () => {
  // Api tokens
  if(auth.has(PULLER.NAME) === false) {
    log({msg: 'No access token found, lets get one'});
    await youtubeAuth.getAccess({ oauth2Client, log: msg => log({msg}) });
  }
  oauth2Client.credentials = auth.get('youtube');
  log({msg: 'Ready !'});
  
  const playlists = await getDefaultsPlaylists(oauth2Client);

  const pullCategories = async () => {
    const categories = await getCategories(oauth2Client);
    db.set('categories', categories).write();
  };

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
    pullCategories(),
    pullLikes(lastLike ? lastLike.id : null),
    pullFavorites(lastFavorite ? lastFavorite.id : null),
  ]);
  parseHistory(lastHistoryParse);

  db.set('last_pull', _.floor(_.now() / 1000)).write();
})().catch(err => { console.log(err); });
