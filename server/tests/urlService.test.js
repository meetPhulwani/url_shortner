const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createShortUrl, resolveRedirect } = require("../services/urlService");

describe("createShortUrl", () => {
    const now = new Date("2026-10-12T00:00:00.000Z");

    it("stores the original URL, short code, domain and expiration date", async () => {
        const saved = [];

        const result = await createShortUrl(
            {
                url: "https://youtube.com/watch?v=123",
                expiresIn: "7d"
            },
            {
                now,
                generateShortCode: async () => "abc12xy",
                saveUrl: async (doc) => {
                    saved.push(doc);
                    return {
                        ...doc,
                        clicks: 0,
                        isActive: true,
                        createdAt: now
                    };
                }
            }
        );

        assert.equal(saved.length, 1);
        assert.deepEqual(saved[0], {
            originalUrl: "https://youtube.com/watch?v=123",
            shortCode: "abc12xy",
            domain: "youtube.com",
            expiresAt: new Date("2026-10-19T00:00:00.000Z")
        });
        assert.equal(result.shortCode, "abc12xy");
        assert.equal(result.domain, "youtube.com");
        assert.equal(saved[0].userId, undefined);
    });

    it("stores userId only when the creator is authenticated", async () => {
        const saved = [];

        await createShortUrl(
            {
                url: "https://example.com",
                expiresIn: "1h"
            },
            {
                now: new Date("2026-10-12T00:00:00.000Z"),
                userId: "user-a",
                generateShortCode: async () => "own3d01",
                saveUrl: async (doc) => {
                    saved.push(doc);
                    return doc;
                }
            }
        );

        assert.equal(saved[0].userId, "user-a");
    });

    it("retries when the generated short code already exists", async () => {
        let attempts = 0;

        const result = await createShortUrl(
            {
                url: "https://example.com",
                expiresIn: "1h"
            },
            {
                now,
                generateShortCode: async () => {
                    attempts += 1;
                    return attempts === 1 ? "taken01" : "unique1";
                },
                saveUrl: async (doc) => {
                    if (doc.shortCode === "taken01") {
                        const error = new Error("duplicate");
                        error.code = 11000;
                        throw error;
                    }

                    return doc;
                }
            }
        );

        assert.equal(attempts, 2);
        assert.equal(result.shortCode, "unique1");
    });

    it("fails after repeated short-code collisions", async () => {
        await assert.rejects(
            () => createShortUrl(
                {
                    url: "https://example.com",
                    expiresIn: "1h"
                },
                {
                    now,
                    generateShortCode: async () => "taken01",
                    saveUrl: async () => {
                        const error = new Error("duplicate");
                        error.code = 11000;
                        throw error;
                    }
                }
            ),
            (error) => {
                assert.equal(error.statusCode, 409);
                assert.match(error.message, /unique short code/i);
                return true;
            }
        );
    });
});

describe("resolveRedirect", () => {
    const now = new Date("2026-10-12T12:00:00.000Z");
    const activeUrl = {
        originalUrl: "https://youtube.com/watch?v=123",
        shortCode: "abc12xy",
        isActive: true,
        expiresAt: new Date("2026-10-19T00:00:00.000Z"),
        clicks: 4
    };

    it("returns the original URL and increments clicks for an active unexpired link", async () => {
        let incrementCalls = 0;

        const result = await resolveRedirect("abc12xy", {
            now,
            findUrl: async () => activeUrl,
            incrementClicks: async (shortCode) => {
                incrementCalls += 1;
                assert.equal(shortCode, "abc12xy");
                return {
                    ...activeUrl,
                    clicks: activeUrl.clicks + 1
                };
            }
        });

        assert.equal(incrementCalls, 1);
        assert.equal(result.originalUrl, "https://youtube.com/watch?v=123");
        assert.equal(result.clicks, 5);
    });

    it("returns 404 when the short code does not exist", async () => {
        let incrementCalls = 0;

        await assert.rejects(
            () => resolveRedirect("missing", {
                now,
                findUrl: async () => null,
                incrementClicks: async () => {
                    incrementCalls += 1;
                }
            }),
            (error) => {
                assert.equal(error.statusCode, 404);
                assert.match(error.message, /not found/i);
                return true;
            }
        );

        assert.equal(incrementCalls, 0);
    });

    it("does not redirect or increment clicks for an inactive link", async () => {
        let incrementCalls = 0;

        await assert.rejects(
            () => resolveRedirect("abc12xy", {
                now,
                findUrl: async () => ({
                    ...activeUrl,
                    isActive: false
                }),
                incrementClicks: async () => {
                    incrementCalls += 1;
                }
            }),
            (error) => {
                assert.equal(error.statusCode, 403);
                assert.match(error.message, /inactive/i);
                return true;
            }
        );

        assert.equal(incrementCalls, 0);
    });

    it("does not redirect or increment clicks for an expired link", async () => {
        let incrementCalls = 0;

        await assert.rejects(
            () => resolveRedirect("abc12xy", {
                now,
                findUrl: async () => ({
                    ...activeUrl,
                    expiresAt: new Date("2026-10-12T12:00:00.000Z")
                }),
                incrementClicks: async () => {
                    incrementCalls += 1;
                }
            }),
            (error) => {
                assert.equal(error.statusCode, 410);
                assert.match(error.message, /expired/i);
                return true;
            }
        );

        assert.equal(incrementCalls, 0);
    });

    it("does not treat POST /shorten as a short code", async () => {
        let findCalls = 0;
        let incrementCalls = 0;

        await assert.rejects(
            () => resolveRedirect("shorten", {
                now,
                findUrl: async () => {
                    findCalls += 1;
                    return activeUrl;
                },
                incrementClicks: async () => {
                    incrementCalls += 1;
                }
            }),
            (error) => {
                assert.equal(error.statusCode, 404);
                return true;
            }
        );

        assert.equal(findCalls, 0);
        assert.equal(incrementCalls, 0);
    });
});
