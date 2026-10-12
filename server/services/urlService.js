const { FORBIDDEN, GONE, NOT_FOUND } = require("../constants/statusCodes");
const { RESERVED_SHORT_CODES } = require("../constants/reservedPaths");
const Url = require("../models/Url");
const { getExpiresAt, isExpired } = require("../utils/expiration");
const { generateShortCode } = require("../utils/shortCode");
const { extractDomain } = require("../utils/url");

const MAX_SHORT_CODE_ATTEMPTS = 3;

const isDuplicateKeyError = (error) => error && error.code === 11000;

const createCollisionError = () => {
    const error = new Error("Could not generate a unique short code. Please try again.");
    error.statusCode = 409;
    error.code = "SHORT_CODE_COLLISION";
    return error;
};

const createShortUrl = async ({ url, expiresIn }, options = {}) => {
    const generateCode = options.generateShortCode || generateShortCode;
    const saveUrl = options.saveUrl || ((doc) => Url.create(doc));
    const now = options.now || new Date();

    const domain = extractDomain(url);
    const expiresAt = getExpiresAt(expiresIn, now);

    for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt += 1) {
        const shortCode = await generateCode();

        try {
            return await saveUrl({
                originalUrl: url,
                shortCode,
                domain,
                expiresAt
            });
        } catch (error) {
            if (!isDuplicateKeyError(error)) {
                throw error;
            }
        }
    }

    throw createCollisionError();
};

const createHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const defaultFindUrl = (shortCode) => Url.findOne({ shortCode }).lean();

const defaultIncrementClicks = (shortCode, now) => Url.findOneAndUpdate(
    {
        shortCode,
        isActive: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
        ]
    },
    { $inc: { clicks: 1 } },
    { new: true, lean: true }
);

const rejectIfUnavailable = (url, now) => {
    if (!url) {
        throw createHttpError(NOT_FOUND, "Short URL not found.");
    }

    if (!url.isActive) {
        throw createHttpError(FORBIDDEN, "This short URL is inactive.");
    }

    if (isExpired(url.expiresAt, now)) {
        throw createHttpError(GONE, "This short URL has expired.");
    }
};

const resolveRedirect = async (shortCode, options = {}) => {
    const now = options.now || new Date();
    const findUrl = options.findUrl || defaultFindUrl;
    const incrementClicks = options.incrementClicks || defaultIncrementClicks;

    if (!shortCode || RESERVED_SHORT_CODES.has(shortCode)) {
        throw createHttpError(NOT_FOUND, "Short URL not found.");
    }

    const url = await findUrl(shortCode);
    rejectIfUnavailable(url, now);

    const updated = await incrementClicks(shortCode, now);

    if (!updated) {
        const latest = await findUrl(shortCode);
        rejectIfUnavailable(latest, now);
        throw createHttpError(NOT_FOUND, "Short URL not found.");
    }

    return {
        originalUrl: updated.originalUrl,
        clicks: updated.clicks
    };
};

module.exports = {
    createShortUrl,
    resolveRedirect
};
