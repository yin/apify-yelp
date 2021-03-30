const Apify = require('apify');

const { log } = Apify.utils;

module.exports.makeBackwardsCompatibleInput = (input) => {
    // deprec in 2021-02
    if (input.searchTerm && !input.searchTerms) {
        log.warning('DEPRECATION OF INPUT: searchTerm is replaced by searchTerms. Please change your input');
        input.searchTerms = [input.searchTerm];
    }
    if (input.location && !input.locations) {
        log.warning('DEPRECATION OF INPUT: location is replaced by locations. Please change your input');
        input.locations = [input.location];
    }
};

module.exports.proxyConfigurationValidated = async ({
    proxyConfig,
    required = true,
    force = Apify.isAtHome(),
    blacklist = ['GOOGLESERP'],
    hint = [],
}) => {
    const configuration = await Apify.createProxyConfiguration(proxyConfig);

    // this works for custom proxyUrls
    if (Apify.isAtHome() && required) {
        if (!configuration || (!configuration.usesApifyProxy && (!configuration.proxyUrls || !configuration.proxyUrls.length)) || !configuration.newUrl()) {
            throw new Error('\n=======\nYou must use Apify proxy or custom proxy URLs\n\n=======');
        }
    }

    // check when running on the platform by default
    if (force) {
        // only when actually using Apify proxy it needs to be checked for the groups
        if (configuration && configuration.usesApifyProxy) {
            if (blacklist.some((blacklisted) => (configuration.groups || []).includes(blacklisted))) {
                throw new Error(`\n=======\nThese proxy groups cannot be used in this actor. Choose other group or contact support@apify.com to give you proxy trial:\n\n*  ${blacklist.join('\n*  ')}\n\n=======`);
            }

            // specific non-automatic proxy groups like RESIDENTIAL, not an error, just a hint
            if (hint.length && !hint.some((group) => (configuration.groups || []).includes(group))) {
                Apify.utils.log.info(`\n=======\nYou can pick specific proxy groups for better experience:\n\n*  ${hint.join('\n*  ')}\n\n=======`);
            }
        }
    }

    return configuration;
};

module.exports.validateInput = (input) => {
    if (!Array.isArray(input.searchTerms) && !Array.isArray(input.directUrls)) {
        throw new Error('A value must be set for either of `searchTerm` or `direcUrls` input parameters. Nothing will be scraped, exiting!');
    }

    if (Array.isArray(input.searchTerms) && input.searchTerms.length > 0
         && Array.isArray(input.directUrls) && input.directUrls.length > 0) {
        log.warning('Skipping searchTerms because directUrls were provided');
    }
};
