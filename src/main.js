/**
 * Yelp restaurant and review scraper.
 */
const Apify = require('apify');
const { CATEGORIES, categorizeUrls } = require('./urls');
const { createCrawler } = require('./crawler-factory');
const requests = require('./request-factory');
const scrapers = require('./scrapers');

const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    const { searchTerm, location, searchLimit = 10, directUrls = [], reviewLimit = 20, proxy } = input;

    if (proxy && proxy.apifyProxyGroups && proxy.apifyProxyGroups.length === 0) delete proxy.apifyProxyGroups;

    if (!proxy) {
        throw new Error('Proxy is required to run this actor. Please, configure a predefined proxy or provide your own proxy server!');
    }

    if (!searchTerm && !directUrls) {
        throw new Error('A value must be set for either of `searchTerm` or `direcUrls` input parameters. Nothing will be scraped, exiting!');
    }

    const proxyConfiguration = await Apify.createProxyConfiguration({
        ...proxy,
    });
    const urlCategories = categorizeUrls(directUrls);
    console.log(urlCategories);
    const businessPageRequests = urlCategories[CATEGORIES.BUSINESS].map((url) => requests.yelpBusinessInfo(url));
    const searchRequests = urlCategories[CATEGORIES.SEARCH].map((url) => requests.yelpSearch(url));
    if (searchTerm) {
        searchRequests.push(requests.yelpSearchTermAndLocation(searchTerm, location));
    }

    const requestQueue = await Apify.openRequestQueue();
    const resultsDataset = await Apify.openDataset();
    const failedSearchDataset = await Apify.openDataset('failed-search');
    const enqueue = async (request) => {
        log.debug('Enqueuing URL: ', { url: request.url });
        return requestQueue.addRequest(request);
    };
    const pushDataTo = (dataset) => async (data) => {
        return dataset.pushData(data);
    };
    try {
        log.info('Scraping is starting up');
        for (const request of [...searchRequests, ...businessPageRequests]) {
            log.info('Adding to queue:', { url: request.url });
            await requestQueue.addRequest(request);
        }
        const scraper = scrapers.createYelpPageHandler(
            { searchLimit, reviewLimit },
            enqueue,
            pushDataTo(resultsDataset),
            pushDataTo(failedSearchDataset),
        );
        const crawler = createCrawler(proxyConfiguration, requestQueue, scraper);
        await crawler.run();
    } catch (exception) {
        log.exception(exception, 'Problem occured while crawling', exception);
    } finally {
        // This is how Java guys make sure log massages are coherent.
        log.info('Scraping finished');
    }
});
