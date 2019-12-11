const { CATEGORIES } = require('./urls');
const extract = require('./extractors');
const requests = require('./request-factory');

const createYelpPageHandler = ({ searchLimit, reviewLimit }, enqueue, pushData) => async ({ request, $ = null, json = null }) => {
    if (request.userData.label === CATEGORIES.SEARCH) {
        console.log('Handling search page:', request.url);
        const searchResultUrls = extract.yelpSearchResultUrls(request.url, $);

        const previoslyScrapedSearchResults = (request.userData && request.userData.payload && request.userData.payload.searchResultsScraped)
            ? request.userData.payload.searchResultsScraped
            : 0;
        const searchResultsFound = previoslyScrapedSearchResults + searchResultUrls.length;
        const resultCountToKeep = searchResultsFound <= searchLimit
            ? searchResultUrls.length
            : searchResultUrls.length - (searchResultsFound - searchLimit);

        console.log('Keeping ', resultCountToKeep, ' results to scrape from ', searchResultUrls.length, ' available');
        const followupBusinessUrls = searchResultsFound <= searchLimit
            ? searchResultUrls
            : searchResultUrls.slice(0, (searchResultsFound) - searchLimit);

        if (resultCountToKeep > 0) {
            const url = new URL(request.url);
            const params = url.searchParams;
            params.delete('start');
            params.append('start', searchResultsFound);
            await enqueue(requests.yelpSearch(url.toString(), { ...request.payload, searchResultsScraped: searchResultsFound }));
        } else {
            console.log('Scraped ', previoslyScrapedSearchResults.length, followupBusinessUrls.length,
                ' results in total. No more search results to scrape.');
        }

        for (const searchResultUrl of followupBusinessUrls) {
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
