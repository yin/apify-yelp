const Apify = require('apify');

const { log } = Apify.utils;

// TODO yin: Do not hadnle failures by pushing #debug to default dataset - dedicate a dataset of it, e.g.: reuse failed-searches DS
/**
 * @param {Apify.ProxyConfiguration} proxyConfiguration
 * @param {Apify.RequestQueue} requestQueue
 */
const createCrawler = ({ proxyConfiguration, requestQueue, pageHandler, maxRequestRetries }) => new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    additionalMimeTypes: ['application/json'],
    maxConcurrency: 50,
    maxRequestRetries,
    useSessionPool: true,
    handlePageTimeoutSecs: 180,
    requestTimeoutSecs: 60,
    ignoreSslErrors: true,
    handlePageFunction: pageHandler,
    handleFailedRequestFunction: async ({ request }) => {
        log.error(`Request ${request.url} failed ${request.retryCount + 1} times, it won't be retried anymore! If some data depended on this request, they are lost!`);
    },
});

module.exports = {
    createCrawler,
};
