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
    const { searchTerm, location, searchLimit = 10, directUrls, reviewLimit = 20, proxy } = input;

    if (proxy && proxy.apifyProxyGroups && proxy.apifyProxyGroups.length === 0) delete proxy.apifyProxyGroups;

    if (!proxy) {
        log.error('Proxy is required to run this actor. Please, configure a predefined proxy or provide your own proxy server!');
        process.exit(1);
    }

    const urlCategories = categorizeUrls(directUrls);
    const businessPageRequests = urlCategories[CATEGORIES.BUSINESS].map(url => requests.yelpBusinessInfo(url));
    const searchRequests = urlCategories[CATEGORIES.SEARCH].map(url => requests.yelpSearch(url));
    if (searchTerm !== undefined) {
        searchRequests.push(requests.yelpSearchTermAndLocation(searchTerm, location));
    }

    const requestQueue = await Apify.openRequestQueue();
    const dataset = await Apify.openDataset();
    const enqueue = async (request) => {
        return requestQueue.addRequest(request);
    };
    const pushData = async (data) => {
        return dataset.pushData(data);
    };
    try {
        console.log('Scraping is starting up');
        for (const request of [...searchRequests, ...businessPageRequests]) {
            console.log('Adding to queue:', request.url);
            await requestQueue.addRequest(request);
        }
        const scraper = scrapers.createYelpPageHandler({ searchLimit, reviewLimit }, enqueue, pushData);
        const crawler = createCrawler(proxy, requestQueue, scraper);
        await crawler.run();
    } catch (exception) {
        console.log('Problem occured while crawling', exception);
        log.exception(exception, 'Problem occured while crawling');
    } finally {
        // This is how Java guys make sure log massages are coherent.
        console.log('Scraping finished');
    }
});
