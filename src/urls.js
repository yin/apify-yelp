const parseUrl = require('url-parse');
const parseDomain = require('parse-domain');

const CATEGORIES = {
    SEARCH: 'search',
    BUSINESS: 'business',
    UNKNOWN: 'unknown',
};

function categorizeUrl(url) {
    const pUrl = parseUrl(url);
    const pDomain = parseDomain(pUrl.host);
    if (pDomain.domain !== 'yelp' || pDomain.subdomain !== undefined || ['http', 'https'].includes(pUrl.protocol)) {
        return CATEGORIES.UNKNOWN;
    }
    if (pUrl.pathname.match(/\/biz\/[^/]+$/)) {
        return CATEGORIES.BUSINESS;
    }
    if (pUrl.pathname.match(/\/search\/[^/]+$/)) {
        return CATEGORIES.SEARCH;
    }
}

const categorizeUrls = (urls) => {
    const categories = {};
    CATEGORIES.forEach((category) => {
        categories[category] = [];
    });
    for (const url of urls) {
        categories[categorizeUrl(url)].push(url);
    }
};

module.exports = {
    categorizeUrl,
    categorizeUrls,
};
