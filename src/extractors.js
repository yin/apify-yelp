const parse = require('url-parse');

const yelpSearchResultUrls = (url, $) => {
    const links = $('ul li h3 a');
    const hrefs = links.map((i, a) => a.attribs.href.replace(/\?.*$/, ''));
    const urlBase = parse(url)
        .set('query', undefined);
    const fullUrls = hrefs.map((i, href) => urlBase.set('pathname', href.toString())
        .toString());
    return fullUrls.toArray();
};

const yelpBusinessId = (url, $) => {
    const bizId = $('meta[name=\'yelp-biz-id\']');
    if (bizId.length === 0) {
        throw new Error('Page does not contain an Business Id');
    }
    if (bizId.length > 1) {
        throw new Error('Page does not contain a single Business Id');
    }
    return bizId[0].attribs.content;
};

const yelpBusinessReviews = (url, json) => {
    return {
        date: json.localizedDate,
        rating: json.rating,
        text: json.comment.text,
        photoUrls: json.photos.map((photo => photo.link.replace(/\/[^./].jpg/, '/o.jpg'))),
    };
};

module.exports = {
    yelpSearchResultUrls,
    yelpBusinessId,
    yelpBusinessReviews,
};
