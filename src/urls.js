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

/**
 * Extract a substring from HTML (usually script tags / JSON-LD).Throws when not found.
 * A better version of substr/substring
 *
 * @param {string} html Plain HTML
 * @param {string} start Start of variable/data. eg: 'var something = '. Excludes the provided "start" string
 * @param {string} end End of the data. eg: '};'. Includes the provided "end" string
 * @param {number} [endOffset=0] Apply an offset to the end
 * @param {number} [startOffset=0] Apply an offset to the start
 */
const subString = (html, start, end, endOffset = 0, startOffset = 0) => {
    const startIndex = html.indexOf(start);
    if (startIndex === -1) {
        throw new Error('"start" not found');
    }
    html = html.slice(startIndex);
    const endIndex = html.indexOf(end);
    if (endIndex === -1) {
        throw new Error('"end" not found');
    }
    return html.slice(start.length + startOffset, endIndex + end.length + endOffset);
};

module.exports = {
    CATEGORIES,
    BASE_URL,
    categorizeUrl,
    categorizeUrls,
    completeYelpUrl,
    subString,
};
