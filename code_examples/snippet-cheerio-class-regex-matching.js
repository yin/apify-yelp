const request = require('request-promise-native');

const cheerio = require('cheerio');

const url = 'https://www.yelp.cz/search?find_desc=burger&find_loc=Praha';

async function func() {
    try {
        const $ = await request({
            url,
            transform: body => cheerio.load(body),
        });
        const found = $('div')
            .filter(
                (i, el) => el.attribs.class
                    && el.attribs.class
                        .split(/\s+/)
                        .map(clazz => clazz.startsWith('pagination-links__'))
                        .reduce((left, right) => left || right)
            );
        console.log(found.length);
    } catch (err) {
        if (err instanceof errors.StatusCodeError) {
            const message = `Search response failed with HTTP code ${err.statusCode}`;
            console.log(message);
        }
    }
}

func()
    .then();
