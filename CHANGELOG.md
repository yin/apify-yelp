### 2021-11-19

*Features*
- Update SDK

*Fixes*
- Random crash when scraping images
- Fix log for number of scraped businesses
- Fix website extraction

### 2021-04-19
*Fixes*
- Fixed page layout change (whole scraper was broken)

### 2021-03-30
- Added support to different languages domains such as yelp.fr to input url.

### 2020-03-25
*Features*
- Enhanced reviews with more fields: `language`, `isFunnyCount`, `isUsefulCount`, `isCoolCount`,`reviewerName`, `reviewerUrl`, `reviewerReviewCount`, `reviewerLocation`
- Scraping `reviewerName`, `reviewerUrl` requires enabling personal data input fields: `scrapeReviewerName`, `scrapeReviewerUrl`
- Added section about GDPR and personal data protection to README

### 2020-02-20
- `searchTerm` and `location` deprecated in favor of `searchTerms` and `locations`. You can scrape any number of those in a single run now.
- Refactored to SDK 1

### 2020-12-01
- Fixed for new layout

### 2020-09-25
- Added `maxRequestRetries` to input and increased its default from `2` to `10`
- Added `cuisine` to output
- Added `website` to output
- Added `images` to output

### 1.0.0

* Data format changed (refer to README.md)
* Fixed scraping information of business
* Updated SDK to 0.21+
* Minor changes to code style and linting
* Updated dependencies
* `priceRange` field changed from `$` / `$$$` to actual prices like `$10-30`
* Reviews dates are now a proper ISO date time string
* Review texts now contains plain text instead of HTML
