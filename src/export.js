const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const PULLERS = require('./pullers_const');

const exportDir = './exports';
if (!fs.existsSync(exportDir)){
  fs.mkdirSync(exportDir);
}

const valueDelimiter = '\t';
const flattenDelimiter = '__';

const propsTransform = {
  [PULLERS.POCKET.NAME]: {
    'flatten': [
      'image',
      'domain_metadata'
    ],
    'delete': [
      'authors',
      'images',
      'image__item_id',
      'image__width',
      'image__height',
      'domain_metadata__greyscale_logo',
      'top_image_url',
      'videos'
    ],
  },
  [PULLERS.YOUTUBE.NAME]: {
    'flatten': [],
    'delete': []
  },
  [PULLERS.REDDIT.NAME]: {
    'flatten': [],
    'delete': []
  },
  [PULLERS.GITHUB.NAME]: {
    'flatten': [],
    'delete': []
  },
  [PULLERS.TWITTER.NAME]: {
    'flatten': [],
    'delete': [
      'in_reply_to_status_id',
      'in_reply_to_status_id_str',
      'in_reply_to_user_id',
      'in_reply_to_user_id_str',
      'in_reply_to_screen_name'
    ]
  }
};

const exportArray = (pullerName, collectionName, collection) => {
  const filePath = path.join(exportDir, pullerName + '_' + collectionName);
  
  const preparedCollection = collection.map(item => {
    const itemCopy = _.cloneDeep(item);
    const flattenedProps = propsTransform[pullerName].flatten.flatMap(propToFlatten => {
      return _.mapKeys(itemCopy[propToFlatten], (value, key) => {
        return propToFlatten + flattenDelimiter + key;
      });
    });
    _.assign(itemCopy, ...flattenedProps);
    const shouldBeDeleted = (v, k) => {
      const isMarked = propsTransform[pullerName].delete.includes(k);
      const asBeenFlattened = propsTransform[pullerName].flatten.includes(k);
      return isMarked || asBeenFlattened;
    };
    return _.omitBy(itemCopy, shouldBeDeleted);
  });
  
  const tsvHeader = _(preparedCollection)
    .flatMap(_.keys)
    .uniq()
    .value();
  console.log(tsvHeader.length + ' props');

  const tsvBody = _(preparedCollection)
    .map(e => tsvHeader.map(h => {
      const value = _.get(e, h);
      return _.isObject(value) ? JSON.stringify(value) : value;
    }).join(valueDelimiter))
    .join('\n');
  
  const tsv = tsvHeader.join(valueDelimiter) + '\n' + tsvBody;
  fs.writeFileSync(filePath + '.tsv', tsv);
  console.log('- wrote', filePath + '.tsv');

  fs.writeFileSync(filePath + '.json', JSON.stringify(preparedCollection, null, 2));
  console.log('- wrote', filePath + '.json');
  console.log('');
};

console.log('PULLERS EXPORT\n');

[
  'POCKET',
  'TWITTER',
  'YOUTUBE',
  'REDDIT',
  'GITHUB'
].forEach(pullerKey => {
  const puller = PULLERS[pullerKey];
  const db = require('../' + puller.FILE);
  console.log(puller.COLOR(puller.NAME));
  Object.entries(db).forEach(([dbKey, dbValue]) => {
    if(Array.isArray(dbValue) && dbValue.length > 0) {
      exportArray(puller.NAME, dbKey, dbValue);
    } else if (pullerKey === 'POCKET' && dbKey === 'archived') {
      exportArray(puller.NAME, 'archived-favorite', dbValue.favorite);
      exportArray(puller.NAME, 'archived-others', dbValue.others);
    }
  });
  console.log('');
});

