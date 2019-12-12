const { CATEGORIES } = require('./urls');
const extract = require('./extractors');
const requests = require('./request-factory');

const createYelpPageHandler = ({ searchLimit, reviewLimit }, enqueue, pushResults, pushFailedSearch) => (
    async ({ request, body, $ = null, json = null }) => {
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

            console.log('\tPreviously found ', previoslyScrapedSearchResults, 'results ');
            console.log('\t', searchResultUrls.length, ' new results available, totaling ', searchResultsFound, ' results found so far');
            console.log('\tKeeping ', resultCountToKeep, ' results to scrape from ', searchResultUrls.length, ' available');
            const followupBusinessUrls = searchResultsFound <= searchLimit
                ? searchResultUrls
                : searchResultUrls.slice(0, resultCountToKeep);

            if (resultCountToKeep > 0) {
                console.log('\tContinuing search at the next search results page');
                const url = new URL(request.url);
                const params = url.searchParams;
                params.delete('start');
                params.append('start', searchResultsFound.toString());
                await enqueue(requests.yelpSearch(url.toString(), {
                    ...request.payload,
                    searchResultsScraped: previoslyScrapedSearchResults + followupBusinessUrls.length,
                }));
            } else {
                console.log('\tScraped ', previoslyScrapedSearchResults.length + resultCountToKeep,
                    ' results in total. No more search results to scrape.');
                pushFailedSearch({ body });
            }

            for (const searchResultUrl of followupBusinessUrls) {
                console.log('Enqueuing business page url ', searchResultUrl);
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
                await pushResults({
                    business: request.userData.payload.business.name,
                    address: request.userData.payload.business.address,
                    review,
                });
            }
            const scrapedReviewCount = request.userData.payload.reviewsScraped
                ? request.userData.payload.reviewsScraped + reviews.length
                : reviews.length;
            const knownReviewCount = json.pagination ? json.pagination.totalResults : reviews.length;
            console.log('\tScraped', scrapedReviewCount, 'reviews so far out of', knownReviewCount, 'reported reviews');
            console.log('\tWe should scrape', reviewLimit, 'reviews and got', scrapedReviewCount);
            if (scrapedReviewCount < knownReviewCount && scrapedReviewCount < reviewLimit) {
                console.log('\tContinuing with next page of reviews');
                await enqueue(requests.yelpBusinessReview(request.userData.payload.business.bizId, scrapedReviewCount,
                    {
                        ...request.userData.payload,
                    }));
            }
        } else {
            console.error('Unknown request label:', request.userData.label);
        }
    });

module.exports = {
    createYelpPageHandler,
};
