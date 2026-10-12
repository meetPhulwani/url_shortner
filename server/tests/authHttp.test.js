require("./helpers/auth");
process.env.NODE_ENV = "test";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const app = require("../app");
const Url = require("../models/Url");
const User = require("../models/User");
const { signTestToken, stubFindUserById } = require("./helpers/auth");

describe("auth HTTP", () => {
    let server;
    let baseUrl;
    let originalCreate;
    let originalFindOne;
    let originalFindById;

    before(async () => {
        originalCreate = User.create;
        originalFindOne = User.findOne;
        originalFindById = User.findById;

        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                const { port } = server.address();
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        User.create = originalCreate;
        User.findOne = originalFindOne;
        User.findById = originalFindById;

        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    });

    const postJson = async (path, body) => {
        const response = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        return {
            status: response.status,
            json: await response.json()
        };
    };

    it("registers a user without returning a password hash", async () => {
        User.create = async (doc) => ({
            _id: "user-1",
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            createdAt: new Date("2026-10-12T00:00:00.000Z")
        });

        const result = await postJson("/api/auth/register", {
            name: "Example User",
            email: "User@Example.com",
            password: "a-strong-example-password"
        });

        assert.equal(result.status, 201);
        assert.equal(result.json.user.email, "user@example.com");
        assert.equal(result.json.user.passwordHash, undefined);
        assert.equal(result.json.password, undefined);
        assert.doesNotMatch(JSON.stringify(result.json), /passwordHash/);
    });

    it("returns 409 for a duplicate email", async () => {
        User.create = async () => {
            const error = new Error("duplicate");
            error.code = 11000;
            throw error;
        };

        const result = await postJson("/api/auth/register", {
            name: "Example User",
            email: "user@example.com",
            password: "a-strong-example-password"
        });

        assert.equal(result.status, 409);
        assert.match(result.json.error, /already registered/i);
    });

    it("logs in with a generic 401 for unknown or invalid credentials", async () => {
        User.findOne = () => ({
            select: () => ({
                lean: async () => null
            })
        });

        const unknown = await postJson("/api/auth/login", {
            email: "missing@example.com",
            password: "a-strong-example-password"
        });

        const passwordHash = await bcrypt.hash("a-strong-example-password", 4);
        User.findOne = () => ({
            select: () => ({
                lean: async () => ({
                    _id: "user-1",
                    name: "Example User",
                    email: "user@example.com",
                    passwordHash
                })
            })
        });

        const wrongPassword = await postJson("/api/auth/login", {
            email: "user@example.com",
            password: "wrong-password"
        });

        assert.equal(unknown.status, 401);
        assert.equal(wrongPassword.status, 401);
        assert.equal(unknown.json.error, wrongPassword.json.error);
    });

    it("returns a JWT on successful login", async () => {
        const passwordHash = await bcrypt.hash("a-strong-example-password", 4);
        User.findOne = () => ({
            select: () => ({
                lean: async () => ({
                    _id: "user-1",
                    name: "Example User",
                    email: "user@example.com",
                    passwordHash
                })
            })
        });

        const result = await postJson("/api/auth/login", {
            email: "user@example.com",
            password: "a-strong-example-password"
        });

        assert.equal(result.status, 200);
        assert.equal(typeof result.json.token, "string");
        assert.equal(result.json.tokenType, "Bearer");
        assert.equal(result.json.user.id, "user-1");
        assert.equal(result.json.user.passwordHash, undefined);
    });

    it("allows authenticated management when NODE_ENV is production", async () => {
        const previousEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
        stubFindUserById(User, {
            _id: "user-1",
            name: "Example User",
            email: "user@example.com"
        });
        Url.find = () => {
            const query = {
                sort() { return query; },
                skip() { return query; },
                limit() { return query; },
                lean: async () => []
            };
            return query;
        };
        Url.countDocuments = async () => 0;

        try {
            const response = await fetch(`${baseUrl}/api/urls`, {
                headers: {
                    Authorization: `Bearer ${signTestToken("user-1")}`
                }
            });

            assert.equal(response.status, 200);
        } finally {
            process.env.NODE_ENV = previousEnv;
        }
    });
});
