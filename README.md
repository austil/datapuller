# Data Puller

![Pull all CLI](./screenshot_pull.png)


This repository is a collection of script I've made to conveniently pull my personnal data from internet services I use the most.  
The goal is to get everything about me in one place for futher analysis (data science with R, full text search with Elastic, ...).

Those scripts pull every bit of interesting data about you available from web services APIs into plain JSON files.

Currently supporting :

- [X] Pocket : unread, archived & favorites
- [X] Twitter : likes, tweets, retweets
- [X] Youtube : likes, favorites, history (via manual import & parsing)
- [X] Reddit : upvoted, saved
- [ ] Github : stars
- [ ] Facebook : likes
- [ ] Spotify : saved tracks & albums
- [X] ~~Browser bookmarks (avaible for analysis via manual import)~~

:hospital: Have a look at [The Data Detox Kit](https://datadetox.myshadow.org/en/detox).

## Run

```bash
# A specific puller (for setup or debug), e.g. twitter
node src/pullers/twitter_pull.js
# All puler at once
npm run start
```

## Setup

* Run `npm install`
* Provide your API Credentials via env variables or a `./config.json` file (have a look at `./src/config_manager.js`)
* Go through the auth procedure of every configured puller by launching them separatly
* Run all puller with `npm run start`

## Restrictions

### Youtube

The watch history and the watch later playlist are [not accessible](https://developers.google.com/youtube/v3/revision_history#september-15-2016) through the Youtube API for privacy reasons.  
To get arround this you can obtain a `watch-history.html` file via the [Google Takeout page](https://takeout.google.com/settings/takeout).
Then, put this file in the `drop_zone` folder so it can be parsed by the youtube puller on the next run.  
As for the watch later playlist, the Google Takeout export is already a JSON file.

## About JavaScript

If you have a quick look at the code, you may notice that this program use several processes, one for each puller to be correct.

```js
const spawnProcess = () => {
  // ...
  const process = spawn('node', [currentPuller.PATH], {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
  // ...
};

for(let n = 0; n < Math.min(PULLERS.MAX_CONCURENCY, pullersQueue.length); n++) {
  spawnProcess();
}
```

It's, indeed, extremely quircky.  
NodeJS was chosen for this project because of the plethora of api wrapper available on NPM and the ease of mind provided by an async single threaded architecture.  
But at some point, true concurency was required in order to not completly block the event loop, so we use good old system processes.  
Yes it smells.

Considering the importance of multi-threading in this project, I will probably suggest Go for a rewrite which is as trendy as JS but a lot less odorous than Node regarding proper concurency.
