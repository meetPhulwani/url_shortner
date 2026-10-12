require("./helpers/auth");

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const {
    authenticate,
    optionalAuthenticate
} = require("../middleware/authenticate");
const { signTestToken } = require("./helpers/auth");
const { verifyAccessToken } = require("../utils/token");

const mockResponse = () => {
    const res = {
        headersSent: false,
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };

    return res;
};

const runAuthenticate = (middleware, req) => new Promise((resolve, reject) => {
    middleware(req, mockResponse(), (error) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(req);
    });
});

const existingUser = {
    _id: "user-1",
    name: "Example User",
    email: "user@example.com"
};

describe("token verification", () => {
    it("accepts a valid token", () => {
        const token = signTestToken("user-1");
        const payload = verifyAccessToken(token);

        assert.equal(payload.sub, "user-1");
        assert.equal(payload.email, undefined);
        assert.equal(payload.password, undefined);
        assert.ok(payload.exp);
    });

    it("rejects an invalid signature", () => {
        const token = jwt.sign({}, "different-secret-value-that-is-long-enough", {
            algorithm: "HS256",
            subject: "user-1",
            expiresIn: "1h"
        });

        assert.throws(() => verifyAccessToken(token));
    });

    it("rejects an expired token", () => {
        const token = signTestToken("user-1", {
            payload: { exp: Math.floor(Date.now() / 1000) - 30 }
        });

        assert.throws(() => verifyAccessToken(token));
    });
});

describe("authenticate", () => {
    it("rejects a missing Bearer token", async () => {
        await assert.rejects(
            () => runAuthenticate(authenticate, { headers: {} }),
            (error) => {
                assert.equal(error.statusCode, 401);
                assert.match(error.message, /authentication required/i);
                return true;
            }
        );
    });

    it("rejects a malformed Authorization header", async () => {
        await assert.rejects(
            () => runAuthenticate(authenticate, {
                headers: { authorization: "Token abc" }
            }),
            (error) => error.statusCode === 401
        );
    });

    it("rejects an invalid signature", async () => {
        const token = jwt.sign({}, "different-secret-value-that-is-long-enough", {
            algorithm: "HS256",
            subject: "user-1",
            expiresIn: "1h"
        });

        await assert.rejects(
            () => runAuthenticate(authenticate, {
                headers: { authorization: `Bearer ${token}` }
            }),
            (error) => {
                assert.equal(error.statusCode, 401);
                assert.match(error.message, /invalid or expired/i);
                return true;
            }
        );
    });

    it("rejects an expired token", async () => {
        const token = signTestToken("user-1", {
            payload: { exp: Math.floor(Date.now() / 1000) - 30 }
        });

        await assert.rejects(
            () => runAuthenticate(authenticate, {
                headers: { authorization: `Bearer ${token}` }
            }),
            (error) => error.statusCode === 401
        );
    });

    it("sets req.user from a valid token when the user still exists", async () => {
        const token = signTestToken("user-1");
        const req = {
            headers: { authorization: `Bearer ${token}` },
            authFindUserById: async () => existingUser
        };

        await runAuthenticate(authenticate, req);

        assert.equal(req.user.id, "user-1");
        assert.equal(req.user.email, "user@example.com");
        assert.equal(req.user.passwordHash, undefined);
    });

    it("rejects a valid token for a deleted user", async () => {
        const token = signTestToken("missing-user");

        await assert.rejects(
            () => runAuthenticate(authenticate, {
                headers: { authorization: `Bearer ${token}` },
                authFindUserById: async () => null
            }),
            (error) => error.statusCode === 401
        );
    });
});

describe("optionalAuthenticate", () => {
    it("continues without a user when no token is sent", async () => {
        const req = { headers: {} };

        await runAuthenticate(optionalAuthenticate, req);

        assert.equal(req.user, undefined);
    });

    it("rejects an invalid token instead of treating the request as anonymous", async () => {
        await assert.rejects(
            () => runAuthenticate(optionalAuthenticate, {
                headers: { authorization: "Bearer not-a-jwt" }
            }),
            (error) => error.statusCode === 401
        );
    });
});
