const request = require('request-promise-native');
const errors = require('request-promise-native/errors');

const cheerio = require('cheerio');

const extract = require('../src/extractors');

const url = 'https://www.yelp.cz/biz/sad-mans-tongue-bar-a-bistro-praha?start=20';

async function func() {
    try {
        const $ = await request({
            url,
            transform: body => cheerio.load(body),
        });

        console.log(extract.yelpBusinessInfo(url, $));
    } catch (err) {
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
}

func().then();
