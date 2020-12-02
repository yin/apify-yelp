const Apify = require('apify');
const { CATEGORIES, BASE_URL } = require('./urls');

const yelpSearch = (url, payload = null) => {
    return {
        url,
        userData: {
            label: CATEGORIES.SEARCH,
            payload: {
                ...payload,
                search: {
                    ...((payload || {}).search),
                    directUrl: url,
                },
            },
        },
    };
};

const yelpSearchTermAndLocation = (searchTerm, location = null, payload = null) => {
    const searchUrl = new URL(`${BASE_URL}/search`);
    const params = searchUrl.searchParams;
    params.append('find_desc', searchTerm);
    if (location !== undefined) {
        params.append('find_loc', location);
    }
    return yelpSearch(searchUrl.toString(), {
        ...payload,
        search: {
            searchTerm,
            location,
        },
    });
};

const yelpBusinessInfo = (url, payload = null) => {
    return {
        url,
        userData: {
            label: CATEGORIES.BUSINESS,
            payload: {
                ...payload,
                business: {
                    ...(payload || {}).business,
                    directUrl: url,
                },
            },
        },
    };
};

/**
 * @param {any} payload
 * @returns {Apify.RequestOptions}
 */
const yelpBizPhotos = (currentUrl, payload) => {
    const businessUrl = new URL(payload.business.directUrl);
    const slug = businessUrl.pathname.split('/biz/', 2)[1];
    const start = new URL(currentUrl).searchParams.get('start') || 0;

    return {
        url: `${BASE_URL}/biz_photos/${slug}?start=${start}`,
        userData: {
            payload,
            label: CATEGORIES.PHOTOS,
            photosStart: start,
        },
    };
};

/**
 * @param {any} payload
 * @returns {Apify.RequestOptions}
 */
const yelpGraphQl = (url, payload) => {
    const { business } = payload;

    return {
        url: `${BASE_URL}/gql/batch`,
        uniqueKey: `${url}${business.bizId}`,
        headers: {
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            DNT: 1,
            Origin: BASE_URL,
            Referrer: url,
        },
        payload: JSON.stringify([
            {
                operationName: 'getLocalBusinessJsonLinkedData',
                variables: { BizEncId: business.bizId },
                extensions: { documentId: '1cf362b8e8f9b3dae26d9f55e7204acd8355c916348a038f913845670139f60a' },
            },
            {
                operationName: 'getCategoryBreadcrumbsJsonLinkedData',
                variables: { BizEncId: business.bizId },
                extensions: { documentId: 'c191d4c5d3fb8bc48927cab3b025bb5bd7b8c472e9849dfdd75f93be10122807' },
            },
            {
                operationName: 'GetBizHeaderData',
                variables: { BizEncId: business.bizId },
                extensions: { documentId: 'bf3356853e2ef75992be0270cfef122a3c46080075b452fb1254d30383b6af56' },
            },
        ]),
        method: 'POST',
        userData: {
            label: CATEGORIES.GRAPHQL,
            payload: {
                ...payload,
                business,
            },
        },
    };
};

const yelpBusinessReview = (bizId, reviewPageStart = undefined, payload = null) => {
    return {
        url: `${BASE_URL}/biz/${bizId}/review_feed?rl=en&sort_by=relevance_desc${reviewPageStart ? `&start=${reviewPageStart}` : ''}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-By-React': true,
        },
        userData: {
            label: CATEGORIES.REVIEW,
            payload: {
                ...payload,
                reviewPageStart,
            },
        },
    };
};

module.exports = {
    yelpSearch,
    yelpSearchTermAndLocation,
    yelpBusinessInfo,
    yelpBusinessReview,
    yelpGraphQl,
    yelpBizPhotos,
};
