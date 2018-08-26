# Data Puller

Get raw access to your data from various internet services.

Currently supporting :

- [X] Pocket : unread, archived & favorites
- [X] Twitter : likes, tweets, retweets
- [X] Youtube : likes, favorites, history (via manual import & parsing)
- [X] Reddit : upvoted, saved
- [ ] Github : stars
- [ ] Facebook : likes
- [ ] Spotify : saved tracks & albums
- [X] ~~Browser bookmarks (avaible for analysis via manual import)~~

## Run

```bash
# A specific puller (for setup or debug), e.g. twitter
node src/twitter_pull.js
# All puler at one
npm run start
```

## Setup

* Run `npm install`
* Provide your API Credentials via env variables or a `./config.json` file (have a look at `./src/config_manager.js`)
* Initialize every configured puller by launching them separatly
* Run all puller with `npm run start`

## Restrictions

### Youtube

The watch history is not accessible through the Youtube API for privacy reasons. 
To get arround this you can obtain a `watch-history.html` file via the [Google Takeout page](https://takeout.google.com/settings/takeout).
Then, put this file in the `drop_zone` folder so it can be parsed by the youtube puller on the next run.
