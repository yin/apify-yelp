const { utils: { log } } = require('apify');
const { parseDomain, ParseResultType } = require('parse-domain');

const BASE_URL = 'https://www.yelp.com';
const BASE_URL_INT = 'https://www.yelp.';

/**
 * @param {string} url
 */
const completeYelpUrl = (url) => {
    if (!url.includes(BASE_URL_INT)) {
        url = `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
    } 
    return url;
};

const CATEGORIES = {
    SEARCH: 'search',
    BUSINESS: 'business',
    PHOTOS: 'photos',
    GRAPHQL: 'graphql',
    REVIEW: 'review',
    UNKNOWN: 'unknown',
};

function categorizeUrl(url) {
    let pUrl;
    try {
        pUrl = new URL(completeYelpUrl(url));
        if (pUrl.protocol && !['http:', 'https:'].includes(pUrl.protocol)) {
            return CATEGORIES.UNKNOWN;
        }
    } catch (e) {
        log.debug('categorizeUrl error', { message: e.message, url });
        return CATEGORIES.UNKNOWN;
    }

    if (pUrl.host) {
        const pDomain = parseDomain(pUrl.host);
        if (pDomain.type === ParseResultType.Listed && pDomain.domain !== 'yelp' && !pDomain.subDomains.includes('www')) {
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
    if (Array.isArray(urls)) {
        for (const url of urls) {
            const fixedUrl = completeYelpUrl(url);
            categories[categorizeUrl(fixedUrl)].push(fixedUrl);
        }
    }
    return categories;
};

module.exports = {
    CATEGORIES,
    BASE_URL,
    categorizeUrl,
    categorizeUrls,
    completeYelpUrl,
};
