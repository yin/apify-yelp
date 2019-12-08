/**
 * Yelp restaurant and review scraper.
 */
const Apify = require('apify');
const { createCrawler } = require('./crawler-factory');
const { CATEGORIES, categorizeUrls, requestYelpSearch } = require('./requests');
const scrapers = require('./scrapers');

const { log } = Apify.utils;
log.setLevel(log.LEVELS.WARNING);

Apify.main(async () => {
    const input = await Apify.getInput();
    const { searchTerm, location, searchLimit = 10, directUrls, resultsLimit = 20, proxy } = input;

    if (proxy.apifyProxyGroups && proxy.apifyProxyGroups.length === 0) delete proxy.apifyProxyGroups;

    if (!proxy) {
        log.error('Proxy is required to run this actor. Please, configure a predefined proxy or provide your own proxy server!');
        process.exit(1);
    }

    const urlCategories = categorizeUrls(directUrls);
    const businessUrls = urlCategories[CATEGORIES.BUSINESS] || [];
    async function collectSearchResults(searchUrl) {
        const searchResults = await requestYelpSearch(searchUrl);
        searchResults.forEach((resultUrl) => {
            businessUrls.push(resultUrl);
        });
    }

    for (const searchUrl of urlCategories[CATEGORIES.SEARCH]) {
        await collectSearchResults(searchUrl);
    }

    if (searchTerm !== undefined) {
        const searchUrl = new URL('yelp.com/search');
        const params = searchUrl.searchParams;
        params.append('find_desc', searchTerm);
        if (location !== undefined) {
            params.append('find_loc', location);
        }
        await collectSearchResults(searchUrl);
    }

    const requests = await Apify.openRequestList('businessses',
        businessUrls.map(url => new Apify.Request({
            url,
            method: 'GET',
        })));

    try {
        console.log('Scraping is starting up');
        const crawler = createCrawler(proxy, requests, scrapers.yelpBusinessReviews);
        await crawler.run();
    } catch (exception) {
        log.exception(exception, 'Problem occured while crawling');
    } finally {
        // This is how Java guys make sure log massages are coherent.
        log.info('Scraping finished');
    }
});
