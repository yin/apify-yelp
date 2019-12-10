const request = require('request-promise-native');
const errors = require('request-promise/errors');
const cheerio = require('cheerio');
const extract = require('../src/extractors');
const scrapers = require('../src/scrapers');

const requestYelpSearch = async (url) => {
    try {
        const $ = await request({
            url,
            transform: body => cheerio.load(body),
        });
        return extract.yelpSearchResultUrls(url, $);
    } catch (err) {
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
};

const requestYelpBusinessReviews = async (url, reviewsLimit = 0) => {
    try {
        const bizId = await requestYelpBusinessId();
        const reviewsJson = await requestYelpBusinessReviewsJson(bizId);
        return scrapers.yelpBusinessReviews(url, reviewsLimit);
    } catch (err) {
        const message = 'Problem occured durring scraping busines reviews';
        console.log(message);
    }
};

const requestYelpBusinessId = async (url) => {
    try {
        const $ = await request({
            url,
            transform: body => cheerio.load(body),
        });
        return extract.yelpBusinessInfo(url, $);
    } catch (err) {
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
};

const requestYelpBusinessReviewsJson = async (businessId, start = null) => {
    try {
        const json = await request({
            url: `https://www.yelp.cz/biz/${businessId}/review_feed?rl=en&sort_by=relevance_desc${start && `&start=${start}`}`,
            json: true,
            headers: {
                'x-requested-by-react': true,
            },
        });
        return json;
    } catch (err) {
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
};

module.exports = {
    requestYelpSearch,
    requestYelpBusinessReviews,
    requestYelpBusinessId,
    requestYelpBusinessReviewsJson,
};
