const request = require('request-promise-native');
const errors = require('request-promise-native/errors');

const cheerio = require('cheerio');

const url = 'https://www.yelp.cz/biz/sad-mans-tongue-bar-a-bistro-praha?start=20';

const yelpBusinessReviews = (url, $) => {
    const reviewsContainer = $('div')
        .filter(
            (i, el) => el.attribs.class
                && el.attribs.class
                    .split(/\s+/)
                    .map(clazz => clazz.startsWith('spinner-container__'))
                    .reduce((left, right) => left || right)
        );

    console.log($(reviewsContainer).html());
    console.log(' ');

    const reviewBoxes = reviewsContainer.find('ul li');

    reviewBoxes.each((i, el) => { console.log(i, $(el).html()); });

    const reviews = reviewBoxes.map((i, el) => {
        try {
            const date = $('div:nth-child(1) div:nth-child(2) div:nth-child(1) div:nth-child(1) div:nth-child(2) span', el)
                .text();
            const rating = $('div:nth-child(1) div:nth-child(2) div:nth-child(1) div:nth-child(1) div:nth-child(1) div:first span', el)
                .attribs['aria-label'].toString()
                .match(/\b\d+\b/);
            const text = reviewBoxes.find('p', el);
            console.log(date, rating, text);
        } catch (err) {
            console.error(err);
        }
    });

    return reviews.toArray();
};

async function func() {
    try {
        const $ = await request({
            url,
            transform: body => cheerio.load(body),
        });

        console.log(yelpBusinessReviews(url, $));
    } catch (err) {
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
}

func().then();
