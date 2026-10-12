const jwt = require("jsonwebtoken");

const TEST_JWT_SECRET = "test-jwt-secret-do-not-use-in-production!!";

if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
}

if (!process.env.JWT_EXPIRES_IN) {
    process.env.JWT_EXPIRES_IN = "1h";
}

if (!process.env.BCRYPT_ROUNDS) {
    process.env.BCRYPT_ROUNDS = "4";
}

const signTestToken = (userId, options = {}) => {
    const payload = { ...(options.payload || {}) };
    const signOptions = {
        algorithm: options.algorithm || "HS256",
        subject: options.subject === undefined ? String(userId) : options.subject
    };

    if (payload.exp === undefined) {
        signOptions.expiresIn = options.expiresIn || "1h";
    }

    return jwt.sign(payload, options.secret || process.env.JWT_SECRET, signOptions);
};

const stubFindUserById = (User, user) => {
    User.findById = () => ({
        select: () => ({
            lean: async () => user
        })
    });
};

module.exports = {
    TEST_JWT_SECRET,
    signTestToken,
    stubFindUserById
};
