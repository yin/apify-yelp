const Apify = require('apify');
const { CATEGORIES } = require('./urls');
const extract = require('./extractors');
const requests = require('./request-factory');

const { log } = Apify.utils;

/**
 * @param {{
 *   searchLimit: number,
 *   reviewLimit: number,
 *   maxImages: number,
 *   requestQueue: Apify.RequestQueue,
 *   failedDataset: Apify.Dataset,
 * }} params
 * @param {(data: any) => Promise<void>} pushResults
 * @param {(data: any) => Promise<void>} pushFailedSearch
 * @returns {Apify.CheerioHandlePage}
 */
const createYelpPageHandler = ({ searchLimit, reviewLimit, maxImages, requestQueue, failedDataset }) => (
    async ({ request, body, $ = null, json = null }) => {
        if (request.userData.label === CATEGORIES.SEARCH) {
            log.info(`Handling search page: ${request.url}`);
            const searchResultUrls = extract.yelpSearchResultUrls(request.url, $);

            const previoslyScrapedSearchResults = (request.userData && request.userData.payload && request.userData.payload.searchResultsScraped)
                ? request.userData.payload.searchResultsScraped
                : 0;
            const searchResultsFound = previoslyScrapedSearchResults + searchResultUrls.length;
            const resultCountToKeep = searchResultsFound <= searchLimit
                ? searchResultUrls.length
                : searchResultUrls.length - (searchResultsFound - searchLimit);

            log.info(`\tPreviously found ${previoslyScrapedSearchResults} results `);
            log.info(`\t${searchResultUrls.length} new results available, totaling ${searchResultsFound} results found so far`);
            log.info(`\tKeeping ${resultCountToKeep} results to scrape from ${searchResultUrls.length} available`);
            const followupBusinessUrls = searchResultsFound <= searchLimit
                ? searchResultUrls
                : searchResultUrls.slice(0, resultCountToKeep);

            if (resultCountToKeep > 0) {
                log.info('\tContinuing search at the next search results page');
                const url = new URL(request.url);
                const params = url.searchParams;
                params.delete('start');
                params.append('start', searchResultsFound.toString());
                await requestQueue.addRequest(requests.yelpSearch(url.toString(), {
                    ...request.userData.payload,
                    searchResultsScraped: previoslyScrapedSearchResults + followupBusinessUrls.length,
                }));
            } else {
                log.info(`\tScraped ${previoslyScrapedSearchResults.length + resultCountToKeep} results in total. No more search results to scrape.`);
                const { userId, actorTaskId, actorRunId, startedAt } = Apify.getEnv();
                failedDataset.pushData({
                    date: Date.now(),
                    startedAt,
                    userId,
                    runId: actorRunId,
                    taskId: actorTaskId,
                    body,
                });
            }

            for (const searchResultUrl of followupBusinessUrls) {
                log.info(`Enqueuing business page url ${searchResultUrl}`);
                await requestQueue.addRequest(requests.yelpBusinessInfo(searchResultUrl, request.userData.payload));
            }
        } else if (request.userData.label === CATEGORIES.BUSINESS) {
            log.info(`Handling business page: ${request.url}`);
            const businessInfo = extract.yelpBusinessPartial($);

            await requestQueue.addRequest(requests[maxImages > 0 ? 'yelpBizPhotos' : 'yelpGraphQl'](request.url, {
                ...request.userData.payload,
                business: { ...request.userData.payload.business, ...businessInfo },
            }));
        } else if (request.userData.label === CATEGORIES.PHOTOS) {
            const { nextUrl, images } = extract.yelpBizPhotos($);
            const currentImages = (request.userData.payload.business.images || []);
            const shouldContinue = nextUrl && maxImages && currentImages.length + images.length < maxImages;

            await requestQueue.addRequest(requests[shouldContinue ? 'yelpBizPhotos' : 'yelpGraphQl'](
                shouldContinue
                    ? nextUrl
                    : request.userData.payload.business.directUrl, {
                    ...request.userData.payload,
                    business: {
                        ...request.userData.payload.business,
                        images: [
                            ...currentImages,
                            ...images,
                        ].slice(0, maxImages > 0 ? maxImages : undefined),
                    },
                },
            ));
        } else if (request.userData.label === CATEGORIES.GRAPHQL) {
            const { payload } = request.userData;
            const enrichedBusinessInfo = extract.yelpBusinessInfo(json);

            const followup = requests.yelpBusinessReview(payload.business.bizId, null, {
                ...request.userData.payload,
                business: { ...request.userData.payload.business, ...enrichedBusinessInfo },
            });
            await requestQueue.addRequest(followup);
        } else if (request.userData.label === CATEGORIES.REVIEW) {
            log.info(`Handling reviews feed: ${request.url}`);
            const payload = (request && request.userData && request.userData.payload) || {};
            const newReviews = extract.yelpBusinessReviews(request.url, json);
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
            log.info(`\tFound ${newReviews.length} reviews so far out of ${totalReviewCount} total reviews`);
            log.info(`\tWe should scrape ${reviewLimit} reviews and got ${allReviews.length}`);

            if (allReviews.length < totalReviewCount && allReviews.length < reviewLimit && newReviews.length > 0) {
                log.info('\tContinuing with next page of reviews...');
                await requestQueue.addRequest(requests.yelpBusinessReview(payload.business.bizId, reviewPageStart + newReviews.length,
                    {
                        ...payload,
                        scrapedReviews: allReviews,
                    }));
            } else {
                log.info('\tNo more reviews to scrape, saving what we got');
                await Apify.pushData({
                    ...request.userData.payload.business,
                    reviews: allReviews,
                });
            }
        } else {
            request.noRetry = true;
            throw new Error(`Unknown request label: ${request.userData.label}`);
        }
    });

module.exports = {
    createYelpPageHandler,
};
