const Apify = require('apify');

// TODO yin: Do not hadnle failures by pushing #debug to default dataset - dedicate a dataset of it, e.g.: reuse failed-searches DS
const createCrawler = (proxy, requestQueue, handlePage, handleFailure = null) => new Apify.CheerioCrawler({
    requestQueue,
    useApifyProxy: true,
    apifyProxyGroups: proxy.apifyProxyGroups,
    additionalMimeTypes: ['application/json'],
    desiredConcurrency: 10,
    maxConcurrency: 50,
    maxRequestRetries: 1,
    handlePageTimeoutSecs: 60,
    handlePageFunction: handlePage,
    handleFailedRequestFunction: handleFailure || (async ({ request }) => {
        console.error(`Request ${request.url} failed too many times`);
        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    }),
});

module.exports = {
    createCrawler,
};
