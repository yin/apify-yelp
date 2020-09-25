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
    const bizId = new Set($("meta[name='yelp-biz-id']").map((_, el) => $(el).attr('content')).get());
    if (bizId.size === 0) {
        throw new Error('Page does not contain an Business Id');
    }
    if (bizId.size > 1) {
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
                businessInfo.cuisine = ld.servesCuisine;
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
        bizId: [...bizId.values()][0],
        name: businessInfo.name || $('h1[class*="heading"]').first().text().trim(),
        description: $('meta[property="og:description"]').first().attr('content'),
        categories: [...new Set(businessInfo.categories)].sort(), // keep categories stable
        type: businessInfo.type || null,
        phone: businessInfo.phone || null,
        website: $('#wrap > div.main-content-wrap.main-content-wrap--full > div > div.lemon--div__373c0__1mboc.margin-t3__373c0__1l90z.margin-b6__373c0__2Azj6.border-color--default__373c0__3-ifU > div > div > div.lemon--div__373c0__1mboc.margin-b6__373c0__2Azj6.border-color--default__373c0__3-ifU > div > div > div:nth-child(1) > div > div.lemon--div__373c0__1mboc.stickySidebar--fullHeight__373c0__1szWY.arrange-unit__373c0__o3tjT.arrange-unit-grid-column--4__373c0__33Wpc.border-color--default__373c0__3-ifU > div > div > section.lemon--section__373c0__fNwDM.margin-b3__373c0__q1DuY.border-color--default__373c0__3-ifU > div > div:nth-child(1) > div > div.lemon--div__373c0__1mboc.arrange-unit__373c0__o3tjT.arrange-unit-fill__373c0__3Sfw1.border-color--default__373c0__3-ifU > p:nth-child(2) > a').text().trim(),
        aggregatedRating: businessInfo.aggregateRating || null,
        priceRange: businessInfo.priceRange || (priceRange.includes('$') ? priceRange : null),
        cuisine: businessInfo.cuisine || null,
        images: $('#wrap > div.main-content-wrap.main-content-wrap--full > div > div.lemon--div__373c0__1mboc.photoHeader__373c0__YdvQE.border-color--default__373c0__3-ifU > div.lemon--div__373c0__1mboc.carousel__373c0__ccjCD.border-color--default__373c0__3-ifU > div img').map((i, el) => $(el).attr('src')).get(),
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
