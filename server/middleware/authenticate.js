const { UNAUTHORIZED } = require("../constants/statusCodes");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");
const { verifyAccessToken } = require("../utils/token");

const AUTH_REQUIRED_ERROR = "Authentication required.";
const INVALID_TOKEN_ERROR = "Invalid or expired token.";

const defaultFindUserById = (id) => User.findById(id).select("_id name email").lean();

const getBearerToken = (header) => {
    if (typeof header !== "string") {
        return null;
    }

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token;
};

const loadAuthenticatedUser = async (token, findUserById) => {
    let payload;

    try {
        payload = verifyAccessToken(token);
    } catch (error) {
        throw createHttpError(UNAUTHORIZED, INVALID_TOKEN_ERROR);
    }

    if (!payload?.sub) {
        throw createHttpError(UNAUTHORIZED, INVALID_TOKEN_ERROR);
    }

    const user = await findUserById(payload.sub);

    if (!user) {
        throw createHttpError(UNAUTHORIZED, INVALID_TOKEN_ERROR);
    }

    return {
        id: String(user._id || user.id),
        name: user.name,
        email: user.email
    };
};

const authenticate = async (req, res, next) => {
    try {
        const token = getBearerToken(req.headers.authorization);

        if (!token) {
            throw createHttpError(UNAUTHORIZED, AUTH_REQUIRED_ERROR);
        }

        req.user = await loadAuthenticatedUser(
            token,
            req.authFindUserById || defaultFindUserById
        );
        return next();
    } catch (error) {
        return next(error);
    }
};

const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = getBearerToken(req.headers.authorization);

        if (!token) {
            return next();
        }

        req.user = await loadAuthenticatedUser(
            token,
            req.authFindUserById || defaultFindUserById
        );
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    authenticate,
    optionalAuthenticate,
    AUTH_REQUIRED_ERROR,
    INVALID_TOKEN_ERROR
};
