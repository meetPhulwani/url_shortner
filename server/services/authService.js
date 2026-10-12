const { CONFLICT, UNAUTHORIZED } = require("../constants/statusCodes");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const { comparePassword, getDummyPasswordHash, hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/token");

const isDuplicateKeyError = (error) => error && error.code === 11000;

const toPublicUser = (user) => ({
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
});

const defaultCreateUser = (doc) => User.create(doc);

const defaultFindUserByEmail = (email) => User.findOne({ email }).select("+passwordHash").lean();

const registerUser = async ({ name, email, password }, options = {}) => {
    const createUser = options.createUser || defaultCreateUser;
    const hash = options.hashPassword || hashPassword;
    const passwordHash = await hash(password);

    try {
        const created = await createUser({
            name,
            email,
            passwordHash
        });

        return toPublicUser(created);
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            throw createHttpError(CONFLICT, "Email is already registered.");
        }

        throw error;
    }
};

const loginUser = async ({ email, password }, options = {}) => {
    const findUserByEmail = options.findUserByEmail || defaultFindUserByEmail;
    const compare = options.comparePassword || comparePassword;
    const signToken = options.signAccessToken || signAccessToken;
    const user = await findUserByEmail(email);
    const passwordHash = user?.passwordHash || await (options.getDummyPasswordHash || getDummyPasswordHash)();
    const passwordMatches = await compare(password, passwordHash);

    if (!user || !passwordMatches) {
        throw createHttpError(UNAUTHORIZED, "Invalid email or password.");
    }

    return {
        token: signToken(user._id || user.id),
        tokenType: "Bearer",
        user: toPublicUser(user)
    };
};

module.exports = {
    registerUser,
    loginUser,
    toPublicUser
};
