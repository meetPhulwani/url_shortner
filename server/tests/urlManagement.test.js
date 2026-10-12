process.env.ENABLE_URL_MANAGEMENT = "true";
process.env.NODE_ENV = "test";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Url = require("../models/Url");

const sample = {
    shortCode: "abc12xy",
    originalUrl: "https://youtube.com/watch?v=123",
    domain: "youtube.com",
    clicks: 4,
    isActive: true,
    expiresAt: new Date("2026-10-19T00:00:00.000Z"),
    createdAt: new Date("2026-10-12T00:00:00.000Z"),
    updatedAt: new Date("2026-10-12T00:00:00.000Z")
};

describe("URL management HTTP", () => {
    let server;
    let baseUrl;
    let originalFindOne;
    let originalFind;
    let originalCountDocuments;
    let originalFindOneAndUpdate;
    let originalFindOneAndDelete;

    before(async () => {
        originalFindOne = Url.findOne;
        originalFind = Url.find;
        originalCountDocuments = Url.countDocuments;
        originalFindOneAndUpdate = Url.findOneAndUpdate;
        originalFindOneAndDelete = Url.findOneAndDelete;

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

    const requestJson = async (method, path, body) => {
        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers: body === undefined
                ? {}
                : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            redirect: "manual"
        });

        const text = await response.text();
        let json = null;

        if (text) {
            json = JSON.parse(text);
        }

        return {
            status: response.status,
            json,
            headers: response.headers
        };
    };

    const stubFindOne = (document) => {
        Url.findOne = () => ({
            lean: async () => document
        });
    };

    it("returns details for an existing URL", async () => {
        stubFindOne(sample);

        const result = await requestJson("GET", "/api/urls/abc12xy");

        assert.equal(result.status, 200);
        assert.equal(result.json.shortCode, "abc12xy");
        assert.equal(result.json.originalUrl, sample.originalUrl);
        assert.equal(result.json._id, undefined);
    });

    it("returns 404 for missing URL details", async () => {
        stubFindOne(null);

        const result = await requestJson("GET", "/api/urls/missing");

        assert.equal(result.status, 404);
        assert.match(result.json.error, /not found/i);
    });

    it("lists URLs with default pagination", async () => {
        Url.find = () => {
            const query = {
                sort() { return query; },
                skip() { return query; },
                limit() { return query; },
                lean: async () => [sample]
            };
            return query;
        };
        Url.countDocuments = async () => 1;

        const result = await requestJson("GET", "/api/urls");

        assert.equal(result.status, 200);
        assert.equal(result.json.data.length, 1);
        assert.deepEqual(result.json.pagination, {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
        });
    });

    it("rejects invalid page and limit values", async () => {
        const invalidPage = await requestJson("GET", "/api/urls?page=0");
        const invalidLimit = await requestJson("GET", "/api/urls?limit=abc");

        assert.equal(invalidPage.status, 400);
        assert.equal(invalidLimit.status, 400);
    });

    it("rejects a limit above 100", async () => {
        const result = await requestJson("GET", "/api/urls?limit=101");

        assert.equal(result.status, 400);
        assert.match(result.json.error, /100/);
    });

    it("rejects protected update fields", async () => {
        const result = await requestJson("PATCH", "/api/urls/abc12xy", {
            clicks: 99
        });

        assert.equal(result.status, 400);
        assert.equal(result.json.error, "Unsupported field: clicks");
    });

    it("updates originalUrl and recalculates domain", async () => {
        stubFindOne(sample);
        Url.findOneAndUpdate = async (filter, update) => ({
            ...sample,
            originalUrl: update.$set.originalUrl,
            domain: update.$set.domain
        });

        const result = await requestJson("PATCH", "/api/urls/abc12xy", {
            url: "https://example.com/new"
        });

        assert.equal(result.status, 200);
        assert.equal(result.json.originalUrl, "https://example.com/new");
        assert.equal(result.json.domain, "example.com");
    });

    it("deactivates a URL and later redirects are rejected", async () => {
        Url.findOneAndUpdate = async () => ({
            ...sample,
            isActive: false
        });

        const deactivated = await requestJson("PATCH", "/api/urls/abc12xy/deactivate");

        assert.equal(deactivated.status, 200);
        assert.equal(deactivated.json.isActive, false);

        stubFindOne({
            ...sample,
            isActive: false
        });

        const redirect = await requestJson("GET", "/abc12xy");

        assert.equal(redirect.status, 403);
        assert.match(redirect.json.error, /inactive/i);
    });

    it("returns 404 when deactivating a missing URL", async () => {
        Url.findOneAndUpdate = async () => null;

        const result = await requestJson("PATCH", "/api/urls/missing/deactivate");

        assert.equal(result.status, 404);
    });

    it("deletes an existing URL", async () => {
        Url.findOneAndDelete = async () => sample;

        const result = await requestJson("DELETE", "/api/urls/abc12xy");

        assert.equal(result.status, 200);
        assert.match(result.json.message, /deleted/i);
    });

    it("returns 404 when deleting a missing URL", async () => {
        Url.findOneAndDelete = async () => null;

        const result = await requestJson("DELETE", "/api/urls/missing");

        assert.equal(result.status, 404);
    });

    it("returns JSON 404 for unknown API routes", async () => {
        const result = await requestJson("POST", "/api/unknown");

        assert.equal(result.status, 404);
        assert.equal(result.json.error, "Route not found.");
    });

    it("returns 400 for malformed JSON", async () => {
        const response = await fetch(`${baseUrl}/shorten`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{ not json"
        });
        const json = await response.json();

        assert.equal(response.status, 400);
        assert.equal(json.error, "Malformed JSON.");
    });

    it("hides simulated database failures from clients", async () => {
        Url.findOne = () => ({
            lean: async () => {
                throw new Error("ECONNREFUSED mongodb://user:secret@cluster.mongodb.net/db");
            }
        });

        const result = await requestJson("GET", "/api/urls/abc12xy");

        assert.equal(result.status, 500);
        assert.equal(result.json.error, "Internal server error.");
        assert.doesNotMatch(JSON.stringify(result.json), /secret/i);
        assert.doesNotMatch(JSON.stringify(result.json), /mongodb/i);
    });
});
