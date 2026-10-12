const extractDomain = (url) => new URL(url).hostname;

const buildPublicShortUrl = (shortCode, baseUrl = process.env.BASE_URL) => {
    if (!baseUrl) {
        const error = new Error("BASE_URL is not configured.");
        error.statusCode = 500;
        throw error;
    }

    return `${baseUrl.replace(/\/$/, "")}/${shortCode}`;
};

module.exports = {
    extractDomain,
    buildPublicShortUrl
};
