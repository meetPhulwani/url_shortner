const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR } = require("../constants/statusCodes");
const { createShortUrl, resolveRedirect } = require("../services/urlService");
const { buildPublicShortUrl } = require("../utils/url");
const { validateShortenInput } = require("../validators/urlValidator");

const createShortUrlHandler = async (req, res) => {
    const error = validateShortenInput(req.body);

    if (error) {
        return res.status(BAD_REQUEST).json({
            error
        });
    }

    try {
        const created = await createShortUrl(req.body, {
            userId: req.user?.id || null
        });

        return res.status(CREATED).json({
            shortUrl: buildPublicShortUrl(created.shortCode),
            shortCode: created.shortCode,
            originalUrl: created.originalUrl,
            domain: created.domain,
            clicks: created.clicks,
            isActive: created.isActive,
            expiresAt: created.expiresAt,
            createdAt: created.createdAt
        });
    } catch (err) {
        const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
        const message = statusCode === INTERNAL_SERVER_ERROR
            ? "Unable to create short URL."
            : err.message;

        return res.status(statusCode).json({
            error: message
        });
    }
};

const redirectShortUrl = async (req, res) => {
    try {
        const { originalUrl } = await resolveRedirect(req.params.shortCode);
        return res.redirect(302, originalUrl);
    } catch (err) {
        const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
        const message = statusCode === INTERNAL_SERVER_ERROR
            ? "Unable to redirect."
            : err.message;

        return res.status(statusCode).json({
            error: message
        });
    }
};

module.exports = {
    createShortUrl: createShortUrlHandler,
    redirectShortUrl
};
