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
