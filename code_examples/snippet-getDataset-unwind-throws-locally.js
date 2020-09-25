const Apify = require('apify');

process.env.APIFY_LOCAL_STORAGE_DIR = 'apify_storage';

Apify.main(async () => {
    const dataset = await Apify.openDataset('default');
    const data = await dataset.getData({
        unwind: 'reviews'
    });
    for (const entry of data.items) {
        console.log(JSON.stringify(entry));
    }
});

