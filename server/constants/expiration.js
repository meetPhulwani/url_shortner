const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const EXPIRATION_MS = {
    "1h": HOUR_MS,
    "6h": 6 * HOUR_MS,
    "1d": DAY_MS,
    "3d": 3 * DAY_MS,
    "7d": 7 * DAY_MS,
    "15d": 15 * DAY_MS,
    "30d": 30 * DAY_MS
};

const ALLOWED_EXPIRATIONS = Object.keys(EXPIRATION_MS);

module.exports = {
    EXPIRATION_MS,
    ALLOWED_EXPIRATIONS
};
