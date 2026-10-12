const MIN_JWT_SECRET_LENGTH = 32;
const DEFAULT_JWT_EXPIRES_IN = "1d";
const DEFAULT_BCRYPT_ROUNDS = 12;

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (typeof secret !== "string" || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
        const error = new Error("JWT_SECRET is missing or shorter than 32 characters.");
        error.code = "INVALID_AUTH_CONFIG";
        throw error;
    }

    return secret.trim();
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;

const getBcryptRounds = () => {
    const parsed = Number(process.env.BCRYPT_ROUNDS);

    if (!Number.isInteger(parsed) || parsed < 4 || parsed > 15) {
        return DEFAULT_BCRYPT_ROUNDS;
    }

    return parsed;
};

const getJwtAlgorithm = () => "HS256";

const validateAuthConfig = () => {
    getJwtSecret();
    getJwtExpiresIn();
    getBcryptRounds();
};

module.exports = {
    MIN_JWT_SECRET_LENGTH,
    DEFAULT_JWT_EXPIRES_IN,
    getJwtSecret,
    getJwtExpiresIn,
    getBcryptRounds,
    getJwtAlgorithm,
    validateAuthConfig
};
