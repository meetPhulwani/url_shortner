const { EXPIRATION_MS } = require("../constants/expiration");

const getExpiresAt = (expiresIn, fromDate = new Date()) => {
    const durationMs = EXPIRATION_MS[expiresIn];

    if (!durationMs) {
        throw new Error(`Unsupported expiration: ${expiresIn}`);
    }

    return new Date(fromDate.getTime() + durationMs);
};

const isExpired = (expiresAt, now = new Date()) => {
    if (!expiresAt) {
        return false;
    }

    return now >= new Date(expiresAt);
};

module.exports = {
    getExpiresAt,
    isExpired
};
