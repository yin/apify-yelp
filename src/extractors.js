const { load } = require('cheerio');
const { CATEGORIES, categorizeUrl, completeYelpUrl } = require('./urls');

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
 * @param {string} url
 * @param {CheerioAPI} $
 */
const yelpBusinessInfo = (url, $) => {
    const bizId = $("meta[name='yelp-biz-id']");
    if (bizId.length === 0) {
        throw new Error('Page does not contain an Business Id');
    }
    if (bizId.length > 1) {
        throw new Error('Page does not contain a single Business Id');
    }
    const businessInfo = {
        aggregateRating: 0,
        categories: [],
        name: '',
        type: '',
        address: {
            addressLocality: null,
            addressRegion: null,
            streetAddress: null,
            postalCode: null,
            addressCountry: null,
        },
    };
    try {
        const lds = $('script[type*="ld"]').map((i, s) => JSON.parse($(s).html())).get();

        for (const ld of lds) {
            if (ld.aggregateRating) {
                businessInfo.aggregateRating = +ld.aggregateRating.ratingValue || 0;
                businessInfo.priceRange = ld.priceRange;
                businessInfo.categories.push(ld.servesCuisine);
                businessInfo.address = {
                    ...ld.address,
                };
                businessInfo.type = ld['@type'];
                businessInfo.phone = ld.telephone;
            }

            if (!businessInfo.category && ld.itemListElement && ld.itemListElement.length) {
                const { item } = ld.itemListElement.pop();
                // category fallback
                if (item && item.name) {
                    businessInfo.categories.push(item.name);
                }
            }
        }
    } catch (e) {
        console.log(e);
    }

    const priceRange = $('div[class*="arrange-unit__"][class*="arrange-unit-fill__"] > span > span').first().text().trim();

    const business = {
        bizId: $('meta[name="yelp-biz-id"]').first().attr('content'),
        name: businessInfo.name || $('h1[class*="heading"]').first().text().trim(),
        description: $('meta[property="og:description"]').first().attr('content'),
        categories: [...new Set(businessInfo.categories)].sort(), // keep categories stable
        type: businessInfo.type || null,
        phone: businessInfo.phone || null,
        aggregatedRating: businessInfo.aggregateRating || null,
        priceRange: businessInfo.priceRange || (priceRange.includes('$') ? priceRange : null),
        address: {
            addressLocality: businessInfo.address.addressLocality || null,
            addressRegion: businessInfo.address.addressRegion || null,
            streetAddress: businessInfo.address.streetAddress || null,
            postalCode: businessInfo.address.postalCode || null,
            addressCountry: businessInfo.address.addressCountry || null,
        },
    };
    return business;
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
    yelpBusinessInfo,
    yelpBusinessReviews,
};
