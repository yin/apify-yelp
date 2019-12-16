const { CATEGORIES } = require('./urls');

const yelpSearch = (url, payload = null) => {
    return {
        url,
        userData: {
            label: CATEGORIES.SEARCH,
            payload: {
                ...payload,
                search: payload && {
                    ...payload.search,
                    directUrl: url,
                },
            },
        },
    };
};

const yelpSearchTermAndLocation = (searchTerm, location = null, payload = null) => {
    const searchUrl = new URL('https://www.yelp.com/search');
    const params = searchUrl.searchParams;
    params.append('find_desc', searchTerm);
    if (location !== undefined) {
        params.append('find_loc', location);
    }
    return yelpSearch(searchUrl.toString(), {
        payload: {
            ...payload,
            search: {
                searchTerm,
                location,
            },
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
                    directUrl: url,
                },
            },
        },
    };
};

const yelpBusinessReview = (bizId, reviewPageStart = undefined, payload = null) => {
    return {
        url: `https://www.yelp.com/biz/${bizId}/review_feed?rl=en&sort_by=relevance_desc${reviewPageStart ? `&start=${reviewPageStart}` : ''}`,
        headers: {
            'x-requested-by-react': true,
        },
        userData: {
            label: CATEGORIES.REVIEW,
            payload: {
                ...payload,
                bizId,
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
};
