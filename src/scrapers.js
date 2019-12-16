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
            const payload = (request && request.userData && request.userData.payload) || {};
            const newReviews = await extract.yelpBusinessReviews(request.url, json);
            const previousReviews = payload.scrapedReviews
                ? payload.scrapedReviews
                : [];
            const allReviews = [
                ...previousReviews,
                ...newReviews,
            ].slice(0, reviewLimit);

            const reviewPageStart = payload.reviewPageStart
                ? payload.reviewPageStart
                : 0;
            const totalReviewCount = json.pagination ? json.pagination.totalResults : allReviews.length;
            console.log('\tFound', newReviews.length, 'reviews so far out of', totalReviewCount, 'total reviews');
            console.log('\tWe should scrape', reviewLimit, 'reviews and got', allReviews.length);

            if (allReviews.length < totalReviewCount && allReviews.length < reviewLimit && newReviews.length > 0) {
                console.log('\tContinuing with next page of reviews...');
                await enqueue(requests.yelpBusinessReview(payload.bizId, reviewPageStart + newReviews.length,
                    {
                        ...payload,
                        scrapedReviews: allReviews,
                    }));
            } else {
                console.log('\tNo more reviews to scrape, saving what we got');
                await pushResults({
                    business: request.userData.payload.business,
                    reviews: allReviews,
                });
            }
        } else {
            console.error('Unknown request label:', request.userData.label);
        }
    });

module.exports = {
    createYelpPageHandler,
};
