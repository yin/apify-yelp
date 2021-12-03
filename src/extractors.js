const { load } = require('cheerio');
const { get, omit } = require('lodash');
const { CATEGORIES, categorizeUrl, completeYelpUrl, BASE_URL } = require('./urls');

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

    // This is not ideal, but I reworked how it was done before
    let payload = {};
    const html = $.html();
    const jsonMatch = html.match(/<!--(\{".*bizDetailsPageProps.*?\})-->/);
    if (jsonMatch) {
        payload = JSON.parse(jsonMatch[1])?.legacyProps?.bizDetailsProps;

        if (!payload) {
            throw new Error('Failed to parse payload');
        }
    } else {
        throw new Error('Could not extract details about business');
    }

    const href = $('a[href^="/biz_redir?"]').first().attr('href');
    const website = href ? new URL(href, 'https://yelp.com').searchParams.get('url') : '';
    const directUrl = get(payload, 'staticUrl', '');

    //phone number could be in another json..
    let otherPhone = null;
    try
    {
        otherPhone = JSON.parse(`{${html.match(/"telephone":".+?"/)[0]}}`).telephone;
    }
    catch { };

    return {
        bizId: [...bizId.values()][0],
        name: get(payload, ['bizDetailsPageProps', 'businessName'], ''),
        since: get(payload, ['bizDetailsPageProps', 'ratingDetailsProps', 'yearJoined'], ''),
        phone: get(payload, ['bizDetailsPageProps', 'bizContactInfoProps', 'phoneNumber'], otherPhone),
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

const yelpBusinessReviews = ({ url, json, scrapeReviewerName, scrapeReviewerUrl }) => {
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
                language: review.comment.language,
                isFunnyCount: review.feedback.counts.funny,
                isUsefulCount: review.feedback.counts.useful,
                isCoolCount: review.feedback.counts.cool,
                photoUrls: review.photos.map(((photo) => new URL(photo.src, url).toString().replace(/\/[^/]+.jpg/, '/o.jpg'))),
                reviewerName: scrapeReviewerName ? review.user.markupDisplayName : null,
                reviewerUrl: scrapeReviewerUrl ? `https://www.yelp.com/${review.user.userUrl}` : null,
                reviewerReviewCount: review.user.reviewCount,
                reviewerLocation: review.user.displayLocation,
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
