const Apify = require('apify');
const { CATEGORIES } = require('./urls');
const extract = require('./extractors');
const requests = require('./request-factory');
const { nonDestructiveMerge } = require('./utils');

const { log } = Apify.utils;

/**
 * @param {{
 *   searchLimit: number,
 *   reviewLimit: number,
 *   maxImages: number,
 *   requestQueue: Apify.RequestQueue,
 *   failedDataset: Apify.Dataset,
 *   includeNonEnglishReviews: boolean,
 * }} params
 * @param {(data: any) => Promise<void>} pushResults
 * @param {(data: any) => Promise<void>} pushFailedSearch
 * @returns {Apify.CheerioHandlePage}
 */
const createYelpPageHandler = ({
    searchLimit,
    reviewLimit,
    maxImages,
    requestQueue,
    failedDataset,
    scrapeReviewerName,
    scrapeReviewerUrl,
    includeNonEnglishReviews,
}) => (
    async ({ request, body, $ = null, json = null }) => {
        if (request.userData.label === CATEGORIES.SEARCH) {
            const searchResultUrls = extract.yelpSearchResultUrls(request.url, $);

            const previoslyScrapedSearchResults = +request?.userData?.payload?.searchResultsScraped
                ? request.userData.payload.searchResultsScraped
                : 0;

            const searchResultsFound = previoslyScrapedSearchResults + searchResultUrls.length;
            const resultCountToKeep = searchResultsFound <= searchLimit
                ? searchResultUrls.length
                : searchResultUrls.length - (searchResultsFound - searchLimit);

            log.info(`[SEARCH]: Extracted ${searchResultUrls.length} new business URLs out of ${searchResultsFound} total --- ${request.url}`);
            const followupBusinessUrls = searchResultsFound <= searchLimit
                ? searchResultUrls
                : searchResultUrls.slice(0, resultCountToKeep);

            if (resultCountToKeep > 0) {
                // log.info('\tContinuing search at the next search results page');
                const url = new URL(request.url);
                const params = url.searchParams;
                params.delete('start');
                params.append('start', searchResultsFound.toString());
                await requestQueue.addRequest(requests.yelpSearch(url.toString(), {
                    ...request.userData.payload,
                    searchResultsScraped: previoslyScrapedSearchResults + followupBusinessUrls.length,
                }));
            } else {
                log.info(`\tScraped ${previoslyScrapedSearchResults + resultCountToKeep} results in total. No more search results to scrape.`);
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
                // log.info(`Enqueuing business page url ${searchResultUrl}`);
                await requestQueue.addRequest(requests.yelpBusinessInfo(searchResultUrl, request.userData.payload));
            }
        } else if (request.userData.label === CATEGORIES.BUSINESS) {
            log.info(`[BUSINESS]: Handling business page: ${request.url}`);
            const businessInfo = extract.yelpBusinessPartial($);

            await requestQueue.addRequest(requests[maxImages > 0 ? 'yelpBizPhotos' : 'yelpGraphQl'](request.url, {
                ...request.userData.payload,
                business: nonDestructiveMerge([ request.userData.payload.business, businessInfo ]),
                scrapeStartedAt: new Date().toISOString(),
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
                    business: nonDestructiveMerge([
                        request.userData.payload.business,
                        {
                            images: [
                                ...currentImages,
                                ...images,
                            ].slice(0, maxImages > 0 ? maxImages : undefined),
                        }
                    ]),
                },
            ));
        } else if (request.userData.label === CATEGORIES.GRAPHQL) {
            const { payload } = request.userData;
            const enrichedBusinessInfo = extract.yelpBusinessInfo(json);

            let followup;
            if (includeNonEnglishReviews) {
                followup = requests.yelpBusinessReviewLanguages(payload.business.bizId, {
                    ...request.userData.payload,
                    business: nonDestructiveMerge([ request.userData.payload.business, enrichedBusinessInfo ]),
                });
            } else {
                followup = requests.yelpBusinessReview(payload.business.bizId, 'en', null, {
                    ...payload,
                    languages: ['en'],
                });
            }

            await requestQueue.addRequest(followup);
        } else if (request.userData.label === CATEGORIES.REVIEW_LANGUAGES) {
            const { payload } = request.userData;
            const languages = extract.yelpReviewLanguages(json);
            log.info(`[REVIEW_LANGUAGES]: Reviews found in the following languages: ${JSON.stringify(languages)}`);

            await Promise.all(languages.map((lng) => {
                const followup = requests.yelpBusinessReview(payload.business.bizId, lng, null, {
                    ...payload,
                    languages,
                });

                return requestQueue.addRequest(followup);
            }));
        } else if (request.userData.label === CATEGORIES.REVIEW) {
            const payload = (request && request.userData && request.userData.payload) || {};
            const newReviews = extract.yelpBusinessReviews({
                url: request.url,
                json,
                scrapeReviewerName,
                scrapeReviewerUrl,
            });
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
            log.info(`[REVIEWS]: Extracted ${allReviews.length}/${totalReviewCount} reviews --- ${request.url}`);

            if (allReviews.length < totalReviewCount && allReviews.length < reviewLimit && newReviews.length > 0) {
                // log.info('\tContinuing with next page of reviews...');
                await requestQueue.addRequest(requests.yelpBusinessReview(payload.business.bizId, payload.lng, reviewPageStart + newReviews.length,{
                    ...payload,
                    scrapedReviews: allReviews,
                }));
            } else {
                // log.info('\tNo more reviews to scrape, saving what we got');
                const data = await Apify.getValue('OUTPUT');
                const output = {
                    ...data,
                    ...request.userData.payload.business,
                    reviewLanguages: [payload.lng].concat(data?.reviewLanguages || []),
                    scrapeFinishedAt: new Date().toISOString(),
                    reviews: allReviews.concat(data?.reviews || []),
                };

                const allLanguagesCount = request.userData.payload.languages.length;
                const currentLanguagesCount = output.reviewLanguages.length;
                if (currentLanguagesCount < allLanguagesCount) {
                    await Apify.setValue('OUTPUT', output);
                } else {
                    output.reviewLanguages = undefined;
                    await Promise.all([
                        Apify.pushData(output),
                        Apify.setValue('OUTPUT', null),
                    ]);
                }
            }
        } else {
            request.noRetry = true;
            throw new Error(`Unknown request label: ${request.userData.label}`);
        }
    });

module.exports = {
    createYelpPageHandler,
};
