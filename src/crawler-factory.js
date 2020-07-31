const Apify = require('apify');

const { log } = Apify.utils;

// TODO yin: Do not hadnle failures by pushing #debug to default dataset - dedicate a dataset of it, e.g.: reuse failed-searches DS
/**
 * @param {Apify.ProxyConfiguration} proxyConfiguration
 * @param {Apify.RequestQueue} requestQueue
 */
const createCrawler = (proxyConfiguration, requestQueue, handlePage, handleFailure = null) => new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    additionalMimeTypes: ['application/json'],
    maxConcurrency: 50,
    maxRequestRetries: 2,
    handlePageTimeoutSecs: 60,
    handlePageFunction: handlePage,
    handleFailedRequestFunction: handleFailure || (async ({ request }) => {
        log.error(`Request ${request.url} failed too many times`);

        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    }),
});

module.exports = {
    createCrawler,
};
