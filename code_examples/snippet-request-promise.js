const util = require('util');
const http = require('http');
const request = require('request-promise-native');
const errors = require('request-promise/errors');

const cheerio = require('cheerio');

const configs = {
    badProtocol: {
        url: 'localhost:31415',
        httpCode: 200,
    },
    statusError: {
        url: 'http://localhost:31415',
        httpCode: 400,
    },
    happy: {
        url: 'http://localhost:31415',
        httpCode: 200,
    }
};
const config = configs.statusError;


const startServer = async () => {
    const server = http.createServer((req, res) => {
        res.writeHead(config.httpCode)
            .end('<html><body>Damn!</body></html>');
    });
    console.log('Server starting...');
    await util.promisify(server.listen.bind(server))(31415);
    console.log('Server started');
    return server;
};

const stopServer = async server => {
    console.log("Server stopping...");
    return await util.promisify(server.close.bind(server))();
};

const doRequest = async () => {
    try {
        console.log('Requesting HTTP server');
        const $ = await request({
            url: 'http://localhost:31415',
            transform: body => cheerio.load(body),
        });
        console.log('Response:', $('body').text());
    } catch (err) {
        // cases:
        // RequestError: Error: bad protocol
        // TransformError: ReferenceError: cheerio is not defined
        // StatusCodeError: {statusCode: 400, message, error: response.body, options, response: undefined}
        console.log(err);
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
        if (err.name === 'StatusCodeError') {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
};


startServer()
    .then(async server => {
        await doRequest();
        await stopServer(server);
        console.log('done');
    });

