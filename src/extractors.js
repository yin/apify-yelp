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
    function extractAddress(property, tag = 'span') {
        const element = $(`.js-biz-details div[itemtype="http://schema.org/LocalBusiness"] address ${tag}[itemprop="${property}"]`);
        if (tag === 'meta') {
            return element.attrib.content.toString();
        }
        return element.text()
            .toString();
    }

    const bizId = $('meta[name=\'yelp-biz-id\']');
    if (bizId.length === 0) {
        throw new Error('Page does not contain an Business Id');
    }
    if (bizId.length > 1) {
        throw new Error('Page does not contain a single Business Id');
    }
    const name = $('h1.biz-page-title')
        .text()
        .toString();
    // There are 3 <address> tags:
    // 1. Above the business header, not shown, contains full address info in http://schema.org/PostalAddress microformat
    // 2. Google Maps component, not shown, contains a <meta> tag with the country
    // 3. Shown underneath the Google maps component, without country
    const address = {
        streetAddress: extractAddress($, 'streetAddress'),
        postalCode: extractAddress($, 'postalCode'),
        addressLocality: extractAddress($, 'addressLocality'),
        country: extractAddress($, 'addressCountry', 'meta'),
    };
    return {
        bizId: bizId[0].attribs.content,
        name,
        address,
    };
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
