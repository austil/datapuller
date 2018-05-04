const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

if (!fs.existsSync('./db')){
  fs.mkdirSync('./db');
}

// Database
const adapter = new FileSync('./db/auth_db.json');
const db = low(adapter);

db.defaults({}).write();

const has = app => db.has(app).value();
const get = app => db.get(app).value();
const set = (app, auth) => db.set(app, auth).write();

module.exports = {
  has,
  get,
  set
};
