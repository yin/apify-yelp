const fs = require('fs');
const request = require('request-promise-native');
const errors = require('request-promise-native/errors');

const cheerio = require('cheerio');

const extract = require('../src/extractors');

async function func() {
    try {
        const content = fs.readFileSync('snippets/pages/business/ovocny-svetozor-praha-9.html');
        console.log("Content len:", content.length);
        const $ = cheerio.load(content);
        const itemLocalBusiness = $(`[itemscope][itemtype="http://schema.org/LocalBusiness"]`);
        const business = {
            bizId: $('meta[name="yelp-biz-id"]')[0].attribs.content,
            name: $('meta[itemprop="name"]', itemLocalBusiness)[0].attribs.content,
            address: {
                streetAddress: $('address [itemprop="streetAddress"]', itemLocalBusiness).text(),
                postalCode: $('address [itemprop="postalCode"]', itemLocalBusiness).text(),
                locality: $('address [itemprop="addressLocality"]', itemLocalBusiness).text(),
                countryCode: $('meta[itemprop="addressCountry"]', itemLocalBusiness)[0].attribs.content,
            }
        };
   } catch (err) {
        console.log(err);
    }
}

func().then();
