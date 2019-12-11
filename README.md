Yelp Scraper
============

Yelp scraper is an [Apify actor](https://apify.com/actors) able to extract reviews and ratings from Yelp business pages.
The scraper is capable of performing Yelp searches, either by querying Yelp with an optional location or by scraping
direct URLs pointing to searches. In addition the scraper recognizes Yelp business pages and scrapes reviews from
direct business URLs.

The scraper uses Apify SDK [Apify SDK](https://sdk.apify.com/) and can be run localy or using
[Apify cloud platform][https://apify.com].

## Input

When using the scraper from Apify webpage of localy, there are multiple configurable input variables available:

| Field | Type | Required | Defualt | Description |
| ----- | ---- | -------- | ------- | ----------- |
| searchTerm | string | Yes | | Used for searching particular item, service or business. |
| location | string | No | | Location to search. |
| searchLimit | number | No | 10 | Number of search results to crawl from each search results page specified. |
| directUrls | array | | Predefined collection of string URLs to scrape review. Can be search URLs or businsess pages, other URLs are ignored. |
| reviewLimit | number | 20 | Minimum number of reviews to scrape. |
| proxy | proxy configuration | N/A | Proxy groups and other proxy related configuration. |

One of `searchTerm` or `directUrls` is required. If none are specified, nothing will be scraped.

If there are more reviews available to scrape due to pagination without additional resource usage, more there will be
more than the given `reviewLimit`. As scraping business pages means additional page requests (and resource usage), the
scraped follows `searchLimit` precisely and newer scrapes more search result than specified.

## Output

You'll get your review in the following schema:

```json
{
  "business": "<business name>"
  "address": {
    "streetAddress": "",
    "postalCode": "",
    "locality": "<city>",
    "country": "<countryCode>"
  },
  "review": {
    "date": "<review date>",
    "rating": "<rating>",
    "text": "<review text>",
    "photos": [
      "http://photoURL",
      ...
    ]
  }
}
```

There is one review per record in the review. For a single business, there are multiple records, each having the
same value for `business` and `address` fields.

## Usage

If you want to run the actor on **Apify platform** you need to open the [actor's page in the library](https://www.apify.com/lukaskrivka/google-sheets) and then click on `Try for free`. That will create a task (actor configuration) on your account. When using public actors, you don't need to build them since everything is done by the author. You only need to provide an input and then you can run them. But keep in mind that usage is always charged towards the one who runs the actor. You can also use [webhooks](#webhooks) to let it run automatically after any actor or task.

If on the other side you want to run the actor **locally**, you need to open the actor's [github page](https://github.com/metalwarrior665/actor-google-sheets) and clone it to your computer.

## Contributions

Feel free to fork me and don't forget for submit your Pull Request!
