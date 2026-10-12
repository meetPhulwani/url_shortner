require("./helpers/auth");
process.env.NODE_ENV = "test";
process.env.BASE_URL = "http://localhost:3000";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Url = require("../models/Url");
const User = require("../models/User");
const { signTestToken, stubFindUserById } = require("./helpers/auth");

const userAId = "64b0f0c0c0c0c0c0c0c0c0a1";
const userBId = "64b0f0c0c0c0c0c0c0c0c0b2";
const ownedByA = {
    shortCode: "abc12xy",
    originalUrl: "https://youtube.com/watch?v=123",
    domain: "youtube.com",
    clicks: 2,
    isActive: true,
    expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    createdAt: new Date("2026-10-12T00:00:00.000Z"),
    updatedAt: new Date("2026-10-12T00:00:00.000Z"),
    userId: userAId
};

describe("URL ownership HTTP", () => {
    let server;
    let baseUrl;
    let originalFindOne;
    let originalFind;
    let originalCountDocuments;
    let originalFindOneAndUpdate;
    let originalFindOneAndDelete;
    let originalCreate;
    let originalFindById;

    before(async () => {
        originalFindOne = Url.findOne;
        originalFind = Url.find;
        originalCountDocuments = Url.countDocuments;
        originalFindOneAndUpdate = Url.findOneAndUpdate;
        originalFindOneAndDelete = Url.findOneAndDelete;
        originalCreate = Url.create;
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
        Url.findOne = originalFindOne;
        Url.find = originalFind;
        Url.countDocuments = originalCountDocuments;
        Url.findOneAndUpdate = originalFindOneAndUpdate;
        Url.findOneAndDelete = originalFindOneAndDelete;
        Url.create = originalCreate;
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

    const requestAs = async (userId, method, path, body) => {
        stubFindUserById(User, {
            _id: userId,
            name: userId === userAId ? "User A" : "User B",
            email: userId === userAId ? "a@example.com" : "b@example.com"
        });

        const headers = {
            Authorization: `Bearer ${signTestToken(userId)}`
        };

        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            redirect: "manual"
        });

        const text = await response.text();

        return {
            status: response.status,
            json: text ? JSON.parse(text) : null
        };
    };

    it("creates an owned URL for the authenticated user and ignores a client userId", async () => {
        Url.create = async (doc) => {
            assert.equal(doc.userId, userAId);
            return {
                ...doc,
                clicks: 0,
                isActive: true,
                createdAt: new Date()
            };
        };

        const result = await requestAs(userAId, "POST", "/shorten", {
            url: "https://youtube.com/watch?v=123",
            expiresIn: "7d",
            userId: userBId
        });

        assert.equal(result.status, 201);
        assert.equal(typeof result.json.shortCode, "string");
    });

    it("lets User A list only their own URLs", async () => {
        Url.find = (filter) => {
            assert.equal(filter.userId, userAId);
            const query = {
                sort() { return query; },
                skip() { return query; },
                limit() { return query; },
                lean: async () => [ownedByA]
            };
            return query;
        };
        Url.countDocuments = async (filter) => {
            assert.equal(filter.userId, userAId);
            return 1;
        };

        const result = await requestAs(userAId, "GET", "/api/urls");

        assert.equal(result.status, 200);
        assert.equal(result.json.data.length, 1);
        assert.equal(result.json.data[0].shortCode, "abc12xy");
    });

    it("does not let User B read, update, deactivate, or delete User A's URL", async () => {
        Url.findOne = (filter) => ({
            lean: async () => (filter.userId === userAId ? ownedByA : null)
        });
        Url.findOneAndUpdate = async (filter) => (
            filter.userId === userAId ? ownedByA : null
        );
        Url.findOneAndDelete = async (filter) => (
            filter.userId === userAId ? ownedByA : null
        );

        const read = await requestAs(userBId, "GET", "/api/urls/abc12xy");
        const update = await requestAs(userBId, "PATCH", "/api/urls/abc12xy", {
            url: "https://evil.example"
        });
        const deactivate = await requestAs(userBId, "PATCH", "/api/urls/abc12xy/deactivate");
        const remove = await requestAs(userBId, "DELETE", "/api/urls/abc12xy");

        assert.equal(read.status, 404);
        assert.equal(update.status, 404);
        assert.equal(deactivate.status, 404);
        assert.equal(remove.status, 404);
    });

    it("does not expose legacy URLs without an owner", async () => {
        Url.findOne = (filter) => ({
            lean: async () => (filter.userId ? null : { ...ownedByA, userId: null })
        });
        Url.find = (filter) => {
            const query = {
                sort() { return query; },
                skip() { return query; },
                limit() { return query; },
                lean: async () => []
            };
            assert.equal(filter.userId, userAId);
            return query;
        };
        Url.countDocuments = async () => 0;

        const details = await requestAs(userAId, "GET", "/api/urls/abc12xy");
        const list = await requestAs(userAId, "GET", "/api/urls");

        assert.equal(details.status, 404);
        assert.equal(list.status, 200);
        assert.equal(list.json.data.length, 0);
    });

    it("keeps anonymous creation and public redirects working", async () => {
        Url.create = async (doc) => {
            assert.equal(doc.userId, undefined);
            return {
                ...doc,
                clicks: 0,
                isActive: true,
                createdAt: new Date()
            };
        };

        const created = await fetch(`${baseUrl}/shorten`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "https://example.com",
                expiresIn: "1h"
            })
        });
        const createdJson = await created.json();

        Url.findOne = () => ({
            lean: async () => ({
                originalUrl: "https://example.com",
                shortCode: createdJson.shortCode,
                isActive: true,
                expiresAt: new Date("2026-12-01T00:00:00.000Z"),
                clicks: 0
            })
        });
        Url.findOneAndUpdate = async () => ({
            originalUrl: "https://example.com",
            clicks: 1
        });

        const redirect = await fetch(`${baseUrl}/${createdJson.shortCode}`, {
            redirect: "manual"
        });

        assert.equal(created.status, 201);
        assert.equal(redirect.status, 302);
        assert.equal(redirect.headers.get("location"), "https://example.com");
    });
});
