const Apify = require('apify');
const { CATEGORIES, categorizeUrls } = require('./urls');
const requests = require('./request-factory');
const scrapers = require('./scrapers');
const { validateInput, makeBackwardsCompatibleInput, proxyConfigurationValidated } = require('./input');

const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    makeBackwardsCompatibleInput(input);
    validateInput(input);

    const {
        maxImages = 10,
        searchTerms,
        locations,
        searchLimit = 10,
        directUrls = [],
        reviewLimit = 20,
        maxRequestRetries = 10,
        proxy,
        scrapeReviewerName = false,
        scrapeReviewerUrl = false,
    } = input;

    const proxyConfiguration = await proxyConfigurationValidated({ proxyConfig: proxy });

    let startRequests = [];

    // URLs trump search terms
    if (Array.isArray(directUrls) && directUrls.length > 0) {
        const urlCategories = categorizeUrls(directUrls);
        console.log(urlCategories);
        const businessPageRequests = urlCategories[CATEGORIES.BUSINESS].map((url) => requests.yelpBusinessInfo(url));
        const searchRequests = urlCategories[CATEGORIES.SEARCH].map((url) => requests.yelpSearch(url));
        startRequests = startRequests.concat(businessPageRequests).concat(searchRequests);
    } else if (Array.isArray(searchTerms)) {
        for (const searchTerm of searchTerms) {
            for (const location of locations) {
                startRequests.push(requests.yelpSearchTermAndLocation(searchTerm, location));
            }
        }
    }

    const requestQueue = await Apify.openRequestQueue();
    const failedDataset = await Apify.openDataset('yelp-failed-search');
    
    log.info('Scraping is starting up');
    for (const request of startRequests) {
        log.info('Adding to queue:', { url: request.url, label: request.userData.label });
        await requestQueue.addRequest(request);
    }
    const handlePageFunction = scrapers.createYelpPageHandler({
        searchLimit,
        reviewLimit,
        maxImages,
        requestQueue,
        failedDataset,
        scrapeReviewerName,
        scrapeReviewerUrl,
    });
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        proxyConfiguration,
        additionalMimeTypes: ['application/json'],
        maxConcurrency: 50,
        maxRequestRetries,
        handlePageTimeoutSecs: 180,
        requestTimeoutSecs: 60,
        handlePageFunction,
    });
    await crawler.run();
});
