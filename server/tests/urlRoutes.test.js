const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Url = require("../models/Url");

describe("POST /shorten validation", () => {
    let server;
    let baseUrl;

    before(async () => {
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                const { port } = server.address();
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
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

    const postShorten = async (body) => {
        const response = await fetch(`${baseUrl}/shorten`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        return {
            status: response.status,
            json: await response.json()
        };
    };

    it("returns 400 when the URL is missing", async () => {
        const result = await postShorten({ expiresIn: "7d" });

        assert.equal(result.status, 400);
        assert.equal(result.json.error, "URL is required.");
    });

    it("returns 400 when the URL is invalid", async () => {
        const result = await postShorten({
            url: "not-a-url",
            expiresIn: "7d"
        });

        assert.equal(result.status, 400);
        assert.equal(result.json.error, "URL must be a valid HTTP or HTTPS URL.");
    });

    it("returns 400 when the protocol is unsupported", async () => {
        const result = await postShorten({
            url: "ftp://example.com",
            expiresIn: "7d"
        });

        assert.equal(result.status, 400);
        assert.equal(result.json.error, "URL must be a valid HTTP or HTTPS URL.");
    });

    it("returns 400 when expiresIn is missing", async () => {
        const result = await postShorten({
            url: "https://youtube.com/watch?v=123"
        });

        assert.equal(result.status, 400);
        assert.equal(result.json.error, "expiresIn is required.");
    });

    it("returns 400 when expiresIn is unsupported", async () => {
        const result = await postShorten({
            url: "https://youtube.com/watch?v=123",
            expiresIn: "2d"
        });

        assert.equal(result.status, 400);
        assert.equal(
            result.json.error,
            "expiresIn must be one of: 1h, 6h, 1d, 3d, 7d, 15d, 30d."
        );
    });

    it("returns 201 with a public short URL when input is valid", async () => {
        const originalCreate = Url.create;
        const now = new Date("2026-10-12T00:00:00.000Z");
        const previousBaseUrl = process.env.BASE_URL;
        process.env.BASE_URL = "http://localhost:3000";

        Url.create = async (doc) => ({
            ...doc,
            clicks: 0,
            isActive: true,
            createdAt: now
        });

        try {
            const result = await postShorten({
                url: "https://youtube.com/watch?v=123",
                expiresIn: "7d"
            });

            assert.equal(result.status, 201);
            assert.equal(result.json.originalUrl, "https://youtube.com/watch?v=123");
            assert.equal(result.json.domain, "youtube.com");
            assert.equal(result.json.clicks, 0);
            assert.equal(result.json.isActive, true);
            assert.equal(typeof result.json.shortCode, "string");
            assert.equal(result.json.shortCode.length, 7);
            assert.equal(
                result.json.shortUrl,
                `http://localhost:3000/${result.json.shortCode}`
            );
        } finally {
            Url.create = originalCreate;
            process.env.BASE_URL = previousBaseUrl;
        }
    });
});
