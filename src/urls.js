const parseUrl = require('url-parse');
const parseDomain = require('parse-domain');

const CATEGORIES = {
    SEARCH: 'search',
    BUSINESS: 'business',
    REVIEW: 'review',
    UNKNOWN: 'unknown',
};

function categorizeUrl(url) {
    const pUrl = parseUrl(url);
    if (pUrl.protocol && !['http:', 'https:'].includes(pUrl.protocol)) {
        return CATEGORIES.UNKNOWN;
    }
    if (pUrl.host) {
        const pDomain = parseDomain(pUrl.host);
        if (pDomain.domain !== 'yelp' && pDomain.subdomain !== 'www') {
            return CATEGORIES.UNKNOWN;
        }
    }
    if (pUrl.pathname.match(/\/biz\/[^/]+(\?.*)?$/)) {
        return CATEGORIES.BUSINESS;
    }
    if (pUrl.pathname.match(/\/search\/?(\?.*)?$/)) {
        return CATEGORIES.SEARCH;
    }
    return CATEGORIES.UNKNOWN;
}

const categorizeUrls = (urls) => {
    const categories = {};
    categories[CATEGORIES.SEARCH] = [];
    categories[CATEGORIES.BUSINESS] = [];
    categories[CATEGORIES.REVIEW] = [];
    categories[CATEGORIES.UNKNOWN] = [];
    for (const url of urls) {
        categories[categorizeUrl(url)].push(url);
    }
    return categories;
};

module.exports = {
    CATEGORIES,
    categorizeUrl,
    categorizeUrls,
};
