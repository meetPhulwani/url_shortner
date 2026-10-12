const validator = require("validator");
const { ALLOWED_EXPIRATIONS } = require("../constants/expiration");
const { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } = require("../constants/pagination");

const isValidHttpUrl = (url) => {
    if (typeof url !== "string") {
        return false;
    }

    return validator.isURL(url, {
        protocols: ["http", "https"],
        require_protocol: true,
        require_valid_protocol: true
    });
};

const validateShortenInput = ({ url, expiresIn } = {}) => {
    if (!url) {
        return "URL is required.";
    }

    if (!isValidHttpUrl(url)) {
        return "URL must be a valid HTTP or HTTPS URL.";
    }

    if (!expiresIn) {
        return "expiresIn is required.";
    }

    if (!ALLOWED_EXPIRATIONS.includes(expiresIn)) {
        return `expiresIn must be one of: ${ALLOWED_EXPIRATIONS.join(", ")}.`;
    }

    return null;
};

const isPositiveIntegerString = (value) => /^[1-9]\d*$/.test(String(value));

const validatePaginationQuery = (query = {}) => {
    let page = DEFAULT_PAGE;
    let limit = DEFAULT_LIMIT;

    if (query.page !== undefined && query.page !== "") {
        if (!isPositiveIntegerString(query.page)) {
            return { error: "page must be a positive integer." };
        }

        page = Number(query.page);
    }

    if (query.limit !== undefined && query.limit !== "") {
        if (!isPositiveIntegerString(query.limit)) {
            return { error: "limit must be a positive integer." };
        }

        limit = Number(query.limit);

        if (limit > MAX_LIMIT) {
            return { error: "limit cannot be greater than 100." };
        }
    }

    return { page, limit };
};

const ALLOWED_UPDATE_FIELDS = new Set(["url", "expiresIn"]);

const validateUrlUpdate = (body = {}) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Invalid request body." };
    }

    const keys = Object.keys(body);

    if (keys.length === 0) {
        return { error: "No updatable fields provided." };
    }

    const unsupportedField = keys.find((key) => !ALLOWED_UPDATE_FIELDS.has(key));

    if (unsupportedField) {
        return { error: `Unsupported field: ${unsupportedField}` };
    }

    if (body.url !== undefined) {
        if (!body.url) {
            return { error: "URL is required." };
        }

        if (!isValidHttpUrl(body.url)) {
            return { error: "URL must be a valid HTTP or HTTPS URL." };
        }
    }

    if (body.expiresIn !== undefined && !ALLOWED_EXPIRATIONS.includes(body.expiresIn)) {
        return {
            error: `expiresIn must be one of: ${ALLOWED_EXPIRATIONS.join(", ")}.`
        };
    }

    return {
        url: body.url,
        expiresIn: body.expiresIn
    };
};

module.exports = {
    ALLOWED_EXPIRATIONS,
    validateShortenInput,
    validatePaginationQuery,
    validateUrlUpdate
};
