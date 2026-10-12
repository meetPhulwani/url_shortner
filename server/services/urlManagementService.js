const { GONE, NOT_FOUND } = require("../constants/statusCodes");
const { LIST_SORT } = require("../constants/pagination");
const Url = require("../models/Url");
const { createHttpError } = require("../utils/httpError");
const { getExpiresAt, isExpired } = require("../utils/expiration");
const { extractDomain } = require("../utils/url");

const toPublicUrl = (doc) => ({
    shortCode: doc.shortCode,
    originalUrl: doc.originalUrl,
    domain: doc.domain,
    clicks: doc.clicks,
    isActive: doc.isActive,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
});

const notFoundError = () => createHttpError(NOT_FOUND, "Short URL not found.");

const defaultFindUrl = (shortCode, userId) => Url.findOne({ shortCode, userId }).lean();

const defaultFindPage = ({ skip, limit, sort, userId }) => Url.find({ userId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

const defaultCountUrls = (userId) => Url.countDocuments({ userId });

const defaultSaveUpdate = (shortCode, userId, update) => Url.findOneAndUpdate(
    { shortCode, userId },
    { $set: update },
    { new: true, runValidators: true, lean: true }
);

const defaultSaveDeactivate = (shortCode, userId) => Url.findOneAndUpdate(
    { shortCode, userId },
    { $set: { isActive: false } },
    { new: true, lean: true }
);

const defaultRemoveUrl = (shortCode, userId) => Url.findOneAndDelete(
    { shortCode, userId },
    { lean: true }
);

const getUrlByShortCode = async (shortCode, userId, options = {}) => {
    const findUrl = options.findUrl || defaultFindUrl;
    const url = await findUrl(shortCode, userId);

    if (!url) {
        throw notFoundError();
    }

    return toPublicUrl(url);
};

const listUrls = async ({ page, limit, userId }, options = {}) => {
    const findPage = options.findPage || defaultFindPage;
    const countUrls = options.countUrls || defaultCountUrls;
    const skip = (page - 1) * limit;
    const sort = LIST_SORT;

    const [docs, total] = await Promise.all([
        findPage({ skip, limit, sort, userId }),
        countUrls(userId)
    ]);

    return {
        data: docs.map(toPublicUrl),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit)
        }
    };
};

const updateUrl = async (shortCode, userId, changes, options = {}) => {
    const now = options.now || new Date();
    const findUrl = options.findUrl || defaultFindUrl;
    const saveUpdate = options.saveUpdate || defaultSaveUpdate;
    const url = await findUrl(shortCode, userId);

    if (!url) {
        throw notFoundError();
    }

    if (isExpired(url.expiresAt, now)) {
        throw createHttpError(GONE, "This short URL has expired.");
    }

    const update = {};

    if (changes.url !== undefined) {
        update.originalUrl = changes.url;
        update.domain = extractDomain(changes.url);
    }

    if (changes.expiresIn !== undefined) {
        update.expiresAt = getExpiresAt(changes.expiresIn, now);
    }

    const saved = await saveUpdate(shortCode, userId, update);

    if (!saved) {
        throw notFoundError();
    }

    return toPublicUrl(saved);
};

const deactivateUrl = async (shortCode, userId, options = {}) => {
    const saveDeactivate = options.saveDeactivate || defaultSaveDeactivate;
    const url = await saveDeactivate(shortCode, userId);

    if (!url) {
        throw notFoundError();
    }

    return toPublicUrl(url);
};

const deleteUrl = async (shortCode, userId, options = {}) => {
    const removeUrl = options.removeUrl || defaultRemoveUrl;
    const url = await removeUrl(shortCode, userId);

    if (!url) {
        throw notFoundError();
    }

    return toPublicUrl(url);
};

module.exports = {
    getUrlByShortCode,
    listUrls,
    updateUrl,
    deactivateUrl,
    deleteUrl
};
