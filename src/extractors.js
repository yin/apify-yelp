const { load } = require('cheerio');
const { get, omit } = require('lodash');
const { CATEGORIES, subString, categorizeUrl, completeYelpUrl, BASE_URL } = require('./urls');

/**
 * Generates an unique array with no empty items
 * @param {any[]} arr
 */
const uniqueNonEmpty = (arr) => [...new Set(arr.filter((s) => s))];

/**
 * @param url
 * @param $
 * @returns {string[]}
 */
const yelpSearchResultUrls = (url, $) => {
    const links = $('ul li h3 a').length > 0 ? $('ul li h3 a') : $('ul li h4 a');
    return links
        .map((i, a) => {
            const url = new URL(completeYelpUrl($(a).attr('href')));
            url.search = '';
            return url.toString();
        })
        .get()
        .filter((href) => categorizeUrl(href) === CATEGORIES.BUSINESS);
};

/**
 * The bare minimum information is available on page load
 *
 * @param {cheerio.CheerioAPI} $
 */
const yelpBusinessPartial = ($) => {
    const bizId = new Set($("meta[name='yelp-biz-id']").map((_, el) => $(el).attr('content')).get());

    if (bizId.size === 0) {
        throw new Error('Page does not contain an Business Id');
    }

    if (bizId.size > 1) {
        throw new Error('Page does not contain a single Business Id');
    }

    const startData = '<!--{"gaConfig":';
    const endData = '}}-->';
    const payload = (() => {
        try {
            return JSON.parse(subString($.html(), startData, endData, -3, -startData.length + 4));
        } catch (e) {
            // we want it to crash if the page doesn't contain the JSON payload, but with an informative message
            throw new Error('Invalid page information, retrying...');
        }
    })();

    const domain = get(payload, ['bizDetailsPageProps', 'bizContactInfoProps', 'businessWebsite', 'linkText'], '');
    const website = domain ? `http://${domain}` : '';
    const directUrl = get(payload, 'staticUrl', '');

    return {
        bizId: [...bizId.values()][0],
        name: get(payload, ['bizDetailsPageProps', 'businessName'], ''),
        since: get(payload, ['bizDetailsPageProps', 'ratingDetailsProps', 'yearJoined'], ''),
        phone: get(payload, ['bizDetailsPageProps', 'bizContactInfoProps', 'phoneNumber'], null),
        website,
        images: [],
        directUrl,
    };
};

/**
 * @param {cheerio.Selector} $
 */
const yelpBizPhotos = ($) => {
    const next = $('.next.pagination-links_anchor');

    return {
        nextUrl: next.length ? `${BASE_URL}${next.attr('href')}` : null,
        images: $('[data-photo-id] img[src]').map((__, el) => {
            const $el = $(el);

            return {
                link: $el.attr('src'),
                alt: $el.attr('alt') || '',
            };
        }).get(),
    };
};

/**
 * @param {any} partial
 */
const yelpBusinessInfo = (json) => {
    const [
        info,
        categories,
        ratings,
    ] = json;

    return {
        address: {
            ...omit(get(info, 'data.business.location.address', {}), '__typename'),
            country: get(info, 'data.business.location.country.code', null),
        },
        type: get(info, 'data.business.categories[0].root.title', null),
        primaryPhoto: get(info, 'data.business.primaryPhoto.photoUrl.url', null),
        priceRange: get(info, 'data.business.priceRange.description', null),
        cuisine: get(info, 'data.business.categories[0].title', null),
        categories: uniqueNonEmpty(get(categories, 'data.business.categories[0].ancestry', []).map((category) => category.title)),
        aggregatedRating: get(ratings, 'data.business.rating', null),
        reviewCount: get(ratings, 'data.business.reviewCount', null),
    };
};

const yelpBusinessReviews = (url, json) => {
    const reviews = new Map();

    json.reviews.forEach((review) => {
        if (!reviews.has(review.id)) {
            const $ = load(review.comment.text.replace(/<br>/g, '\n'), { decodeEntities: true, normalizeWhitespace: true });

            reviews.set(review.id, {
                date: new Date(review.localizedDate).toISOString(),
                rating: review.rating,
                text: $('body')
                    .map((i, s) => $(s).text())
                    .get()
                    .filter((s) => s)
                    .join('\n'),
                photoUrls: review.photos.map(((photo) => new URL(photo.src, url).toString().replace(/\/[^/]+.jpg/, '/o.jpg'))),
            });
        }
    });

    return [...reviews.values()];
};

module.exports = {
    yelpSearchResultUrls,
    yelpBusinessPartial,
    yelpBusinessInfo,
    yelpBusinessReviews,
    yelpBizPhotos,
};
