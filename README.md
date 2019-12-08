Yelp Scraper
============

Yelp scraper is an [Apify actor](https://apify.com/actors) to extract review and ratings from Yelp business pages.
The scraper is capable of performing Yelp searches, either by querying Yelp with an optional location or by scraping
direct search URLs. In addition the scraper recognizes Yelp business pages and scrapes reviews from direct business
URLs.

The scraper uses Apify SDK [Apify SDK](https://sdk.apify.com/) and can be run localy or using
[Apify cloud platform][https://apify.com].

## Input

There are multiple configurable input variables:

| Field | Type | Required | Defualt | Description |
| ----- | ---- | -------- | ------- | ----------- |
| searchTerm | string | Yes | | Used for searching particular item, service or business. |
| location | string | No | | Location to search. |
| searchLimit | number | No | 10 | Number of search results to crawl from each search results page specified. |
| directUrls | array | | Predefined collection of string URLs to scrape review. Can be search URLs or businsess pages, other URLs are ignored. |
| reviewLimit | number | 20 | Minimum number of reviews to scrape. |
| proxy | proxy configuration | N/A | Proxy groups and other proxy related configuration. |
| pageFunction | javascript |  | Function to be used to extract additional data from each business page. |

One of `searchTerm` or `directUrls` is required. If none are specified, nothing will be scraped.

Configuration `searchLimit` is not used yet, in current version only the result from the first page are crawled.

If there are more reviews available to scrape due to pagination without additional resource usage, more there will be
more than the given `reviewLimit`.

`pageFunction` is not used yet and might be removed due to security issue in the future.

## Output

You'll get your review date in the following schema:

```json
{
  "business": "<business name>"
  "address": "<business address",
  "reviews": [
    {
      "date": "<review date>",
      "rating": "<rating>",
      "text": "<review text",
      "photos": [
        "http://photoURL",
        ...
      ]
    },
    ...
  ]
}
```

## Usage

If you want to run the actor on **Apify platform** you need to open the [actor's page in the library](https://www.apify.com/lukaskrivka/google-sheets) and then click on `Try for free`. That will create a task (actor configuration) on your account. When using public actors, you don't need to build them since everything is done by the author. You only need to provide an input and then you can run them. But keep in mind that usage is always charged towards the one who runs the actor. You can also use [webhooks](#webhooks) to let it run automatically after any actor or task.

If on the other side you want to run the actor **locally**, you need to open the actor's [github page](https://github.com/metalwarrior665/actor-google-sheets) and clone it to your computer.

## Contributions

Feel free to fork me and don't forget for submit your Pull Request!
