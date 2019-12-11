const parse = require('url-parse');

/**
 * @param url
 * @param $
 * @returns {string[]}
 */
const yelpSearchResultUrls = (url, $) => {
    const links = $('ul li h3 a');
    const hrefs = links.map((i, a) => a.attribs.href);
    const urlBase = parse(url)
        .set('query', '');
    const fullUrls = hrefs
        .map((i, href) => urlBase.set('pathname', href.toString())
            .toString());
    return fullUrls.toArray();
};

const yelpBusinessInfo = (url, $) => {
    const bizId = $('meta[name=\'yelp-biz-id\']');
    if (bizId.length === 0) {
        throw new Error('Page does not contain an Business Id');
    }
    if (bizId.length > 1) {
        throw new Error('Page does not contain a single Business Id');
    }
    const itemLocalBusiness = $('[itemscope][itemtype="http://schema.org/LocalBusiness"]');
    const business = {
        bizId: $('meta[name="yelp-biz-id"]')[0].attribs.content,
        name: $('meta[itemprop="name"]', itemLocalBusiness)[0].attribs.content,
        address: {
            streetAddress: $('address [itemprop="streetAddress"]', itemLocalBusiness).text(),
            postalCode: $('address [itemprop="postalCode"]', itemLocalBusiness).text(),
            locality: $('address [itemprop="addressLocality"]', itemLocalBusiness).text(),
            countryCode: $('meta[itemprop="addressCountry"]', itemLocalBusiness)[0].attribs.content,
        },
    };
    return business;
};

const yelpBusinessReviews = (url, json) => {
    return json.reviews.map(review => ({
        date: review.localizedDate,
        rating: review.rating,
        text: review.comment.text,
        photoUrls: review.photos.map((photo => photo.link.replace(/\/[^./].jpg/, '/o.jpg'))),
    }));
};

module.exports = {
    yelpSearchResultUrls,
    yelpBusinessInfo,
    yelpBusinessReviews,
};
