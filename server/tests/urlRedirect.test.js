const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Url = require("../models/Url");

describe("GET /:shortCode", () => {
    let server;
    let baseUrl;
    let originalFindOne;
    let originalFindOneAndUpdate;

    before(async () => {
        originalFindOne = Url.findOne;
        originalFindOneAndUpdate = Url.findOneAndUpdate;

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
        Url.findOneAndUpdate = originalFindOneAndUpdate;

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

    const getShortCode = async (shortCode) => {
        return fetch(`${baseUrl}/${shortCode}`, {
            redirect: "manual"
        });
    };

    const stubLookup = (document) => {
        Url.findOne = () => ({
            lean: async () => document
        });
    };

    it("redirects to the original URL and increments clicks", async () => {
        let incrementFilter = null;
        let incrementUpdate = null;

        stubLookup({
            originalUrl: "https://youtube.com/watch?v=123",
            shortCode: "abc12xy",
            isActive: true,
            expiresAt: new Date("2026-12-01T00:00:00.000Z"),
            clicks: 2
        });

        Url.findOneAndUpdate = async (filter, update) => {
            incrementFilter = filter;
            incrementUpdate = update;
            return {
                originalUrl: "https://youtube.com/watch?v=123",
                clicks: 3
            };
        };

        const response = await getShortCode("abc12xy");

        assert.equal(response.status, 302);
        assert.equal(response.headers.get("location"), "https://youtube.com/watch?v=123");
        assert.equal(incrementFilter.shortCode, "abc12xy");
        assert.equal(incrementFilter.isActive, true);
        assert.deepEqual(incrementUpdate, { $inc: { clicks: 1 } });
    });

    it("returns 404 when the short code does not exist", async () => {
        stubLookup(null);
        Url.findOneAndUpdate = async () => {
            throw new Error("increment should not run");
        };

        const response = await getShortCode("missing");
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.match(body.error, /not found/i);
    });

    it("returns 403 for an inactive link", async () => {
        stubLookup({
            originalUrl: "https://youtube.com/watch?v=123",
            shortCode: "abc12xy",
            isActive: false,
            expiresAt: new Date("2026-12-01T00:00:00.000Z"),
            clicks: 2
        });
        Url.findOneAndUpdate = async () => {
            throw new Error("increment should not run");
        };

        const response = await getShortCode("abc12xy");
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.match(body.error, /inactive/i);
    });

    it("returns 410 for an expired link", async () => {
        stubLookup({
            originalUrl: "https://youtube.com/watch?v=123",
            shortCode: "abc12xy",
            isActive: true,
            expiresAt: new Date("2020-01-01T00:00:00.000Z"),
            clicks: 2
        });
        Url.findOneAndUpdate = async () => {
            throw new Error("increment should not run");
        };

        const response = await getShortCode("abc12xy");
        const body = await response.json();

        assert.equal(response.status, 410);
        assert.match(body.error, /expired/i);
    });

    it("does not treat GET /shorten as a short-code redirect", async () => {
        Url.findOne = async () => {
            throw new Error("lookup should not run for reserved paths");
        };

        const response = await getShortCode("shorten");
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.match(body.error, /not found/i);
    });
});
