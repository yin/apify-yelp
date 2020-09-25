const urls = require('../src/urls');

for (url of process.argv) {
    const category = urls.categorizeUrl(url)
    console.log(category, url);
}
console.log();
console.log(urls.categorizeUrls(process.argv));
