const Apify = require('apify');

const createCrawler = (proxy, requestCollection, handlePage, handleFailure = null) => new Apify.CheerioCrawler({
    requestCollection,
    useApifyProxy: true,
    // TODO gagyi: Remove the default here
    apifyProxyGroups: proxy.apifyProxyGroups || ['BUYPROXIES84958'],
    minConcurrency: 10,
    maxConcurrency: 50,
    maxRequestRetries: 1,
    handlePageTimeoutSecs: 60,
    handlePageFunction: handlePage,
    handleFailedRequestFunction: handleFailure || (async ({ request }) => {
        console.log(`Request ${request.url} failed too many times`);
        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    }),
});

module.exports = {
    createCrawler,
};
