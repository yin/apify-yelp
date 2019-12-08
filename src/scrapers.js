const extract = require('./extractors');
const requests = require('./requests');

const yelpBusinessReviews = async ({url, page, reviewsLimit = 0}) => {
    try {
        const bizId = extract.yelpBusinessId(url, page);
        const reviewsJson = await requests.requestYelpBusinessReviewsJson(bizId);
        let knownReviewCount = Number.MAX_SAFE_INTEGER;
        const collectedReviews = [];
        while (collectedReviews.length < reviewsLimit && collectedReviews < knownReviewCount) {
            const reviews = extract.yelpBusinessReviews(url, reviewsJson);
            reviews.forEach((review) => {
                collectedReviews.push(review);
            });
            if (reviewsJson.pagination) {
                knownReviewCount = reviewsJson.pagination.totalResults;
            }
            return collectedReviews;
        }
    } catch (err) {
        const message = 'Problem occured durring scraping busines reviews';
        console.log(message);
    }
};

module.exports = {
    yelpBusinessReviews,
};
