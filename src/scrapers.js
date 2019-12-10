const { CATEGORIES } = require('./urls');
const extract = require('./extractors');
const requests = require('./request-factory');

const createYelpPageHandler = ({ searchLimit, reviewLimit }, enqueue, pushData) => async ({ request, $ = null, json = null }) => {
    console.log(`Processing ${request.url}...`);
    if (request.userData.label === CATEGORIES.SEARCH) {
        console.log('Handling search page:', request.url);
        const searchReusltUrls = extract.yelpSearchResultUrls(request.url, $);
        for (const searchResultUrl of searchReusltUrls) {
            await enqueue(requests.yelpBusinessInfo(searchResultUrl, request.payload));
        }
    } else if (request.userData.label === CATEGORIES.BUSINESS) {
        console.log('Handling business page:', request.url);
        const businessInfo = extract.yelpBusinessInfo(request.url, $);
        const followup = requests.yelpBusinessReview(businessInfo.bizId, null, {
            ...request.payload,
            business: { ...request.userData.payload.business, ...businessInfo },
        });
        await enqueue(followup);
    } else if (request.userData.label === CATEGORIES.REVIEW) {
        console.log('Handling reviews feed:', request.url);
        const reviews = await extract.yelpBusinessReviews(request.url, json);
        for (const review of reviews) {
            await pushData({
                business: request.userData.payload.business.name,
                address: request.userData.payload.business.address,
                review,
            });
        }
        const scrapedReviewCount = request.userData.payload.reviewsScraped + reviews.length;
        const knownReviewCount = json.pagination ? json.pagination.totalResults : reviews.length;
        if (scrapedReviewCount < knownReviewCount && scrapedReviewCount.length < reviewLimit) {
            await enqueue(requests.yelpBusinessReview(request.userData.payload.business.bizId, reviews.length,
                {
                    ...request.userData.payload,
                    reviewsScraped: scrapedReviewCount,
                }));
        }
    } else {
        console.error('Unknown request label:', request.userData.label);
    }
};

module.exports = {
    createYelpPageHandler,
};
