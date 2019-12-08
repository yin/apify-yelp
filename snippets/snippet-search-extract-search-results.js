const request = require('request-promise-native');
const handlers = require('./src/page-handlers');

const cheerio = require('cheerio');

const url = 'https://www.yelp.cz/search?find_desc=burger&find_loc=Praha';

console.log(handlers.requestYelpSearch(url));
