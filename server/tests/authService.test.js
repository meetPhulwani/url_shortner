require("./helpers/auth");

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { loginUser, registerUser } = require("../services/authService");

describe("registerUser", () => {
    it("hashes the password and returns public user metadata", async () => {
        const created = await registerUser(
            {
                name: "Example User",
                email: "user@example.com",
                password: "a-strong-example-password"
            },
            {
                hashPassword: async (password) => {
                    assert.equal(password, "a-strong-example-password");
                    return "hashed-password";
                },
                createUser: async (doc) => {
                    assert.equal(doc.passwordHash, "hashed-password");
                    assert.equal(doc.email, "user@example.com");
                    return {
                        _id: "user-1",
                        name: doc.name,
                        email: doc.email,
                        passwordHash: doc.passwordHash,
                        createdAt: new Date("2026-10-12T00:00:00.000Z")
                    };
                }
            }
        );

        assert.deepEqual(created, {
            id: "user-1",
            name: "Example User",
            email: "user@example.com",
            createdAt: new Date("2026-10-12T00:00:00.000Z")
        });
        assert.equal(created.passwordHash, undefined);
        assert.equal(created.password, undefined);
    });

    it("returns 409 when the unique email index rejects a duplicate", async () => {
        await assert.rejects(
            () => registerUser(
                {
                    name: "Example User",
                    email: "user@example.com",
                    password: "a-strong-example-password"
                },
                {
                    hashPassword: async () => "hashed-password",
                    createUser: async () => {
                        const error = new Error("duplicate");
                        error.code = 11000;
                        throw error;
                    }
                }
            ),
            (error) => {
                assert.equal(error.statusCode, 409);
                assert.match(error.message, /already registered/i);
                return true;
            }
        );
    });

    it("hashes with bcrypt so the original password can be verified", async () => {
        let storedHash;

        await registerUser(
            {
                name: "Example User",
                email: "user@example.com",
                password: "a-strong-example-password"
            },
            {
                createUser: async (doc) => {
                    storedHash = doc.passwordHash;
                    return {
                        _id: "user-1",
                        name: doc.name,
                        email: doc.email,
                        createdAt: new Date()
                    };
                }
            }
        );

        assert.equal(await bcrypt.compare("a-strong-example-password", storedHash), true);
        assert.equal(await bcrypt.compare("wrong-password", storedHash), false);
        assert.notEqual(storedHash, "a-strong-example-password");
    });
});

describe("loginUser", () => {
    const passwordHash = bcrypt.hashSync("a-strong-example-password", 4);

    it("returns a JWT for valid credentials", async () => {
        const result = await loginUser(
            {
                email: "user@example.com",
                password: "a-strong-example-password"
            },
            {
                findUserByEmail: async (email) => {
                    assert.equal(email, "user@example.com");
                    return {
                        _id: "user-1",
                        name: "Example User",
                        email,
                        passwordHash
                    };
                },
                signAccessToken: (userId) => {
                    assert.equal(userId, "user-1");
                    return "signed-token";
                }
            }
        );

        assert.equal(result.token, "signed-token");
        assert.equal(result.tokenType, "Bearer");
        assert.equal(result.user.id, "user-1");
        assert.equal(result.user.passwordHash, undefined);
    });

    it("returns the same generic error for a wrong password", async () => {
        await assert.rejects(
            () => loginUser(
                {
                    email: "user@example.com",
                    password: "wrong-password"
                },
                {
                    findUserByEmail: async () => ({
                        _id: "user-1",
                        email: "user@example.com",
                        passwordHash
                    })
                }
            ),
            (error) => {
                assert.equal(error.statusCode, 401);
                assert.equal(error.message, "Invalid email or password.");
                return true;
            }
        );
    });

    it("returns the same generic error for an unknown email", async () => {
        await assert.rejects(
            () => loginUser(
                {
                    email: "missing@example.com",
                    password: "a-strong-example-password"
                },
                {
                    findUserByEmail: async () => null,
                    getDummyPasswordHash: async () => passwordHash
                }
            ),
            (error) => {
                assert.equal(error.statusCode, 401);
                assert.equal(error.message, "Invalid email or password.");
                return true;
            }
        );
    });
});
