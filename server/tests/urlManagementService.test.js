const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
    getUrlByShortCode,
    listUrls,
    updateUrl,
    deactivateUrl,
    deleteUrl
} = require("../services/urlManagementService");

const sample = {
    shortCode: "abc12xy",
    originalUrl: "https://youtube.com/watch?v=123",
    domain: "youtube.com",
    clicks: 4,
    isActive: true,
    expiresAt: new Date("2026-10-19T00:00:00.000Z"),
    createdAt: new Date("2026-10-12T00:00:00.000Z"),
    updatedAt: new Date("2026-10-12T00:00:00.000Z"),
    _id: "internal-id",
    __v: 0
};

describe("getUrlByShortCode", () => {
    it("returns public metadata for an existing URL", async () => {
        const result = await getUrlByShortCode("abc12xy", {
            findUrl: async () => sample
        });

        assert.equal(result.shortCode, "abc12xy");
        assert.equal(result.originalUrl, sample.originalUrl);
        assert.equal(result.clicks, 4);
        assert.equal(result._id, undefined);
        assert.equal(result.__v, undefined);
    });

    it("returns 404 when the URL does not exist", async () => {
        await assert.rejects(
            () => getUrlByShortCode("missing", { findUrl: async () => null }),
            (error) => {
                assert.equal(error.statusCode, 404);
                assert.match(error.message, /not found/i);
                return true;
            }
        );
    });
});

describe("listUrls", () => {
    it("returns default pagination metadata and createdAt descending order", async () => {
        const docs = [
            { ...sample, shortCode: "newer01", createdAt: new Date("2026-10-12T02:00:00.000Z") },
            { ...sample, shortCode: "older01", createdAt: new Date("2026-10-12T01:00:00.000Z") }
        ];

        const result = await listUrls(
            { page: 1, limit: 10 },
            {
                findPage: async ({ skip, limit, sort }) => {
                    assert.equal(skip, 0);
                    assert.equal(limit, 10);
                    assert.deepEqual(sort, { createdAt: -1, shortCode: 1 });
                    return docs;
                },
                countUrls: async () => 2
            }
        );

        assert.equal(result.data.length, 2);
        assert.equal(result.data[0]._id, undefined);
        assert.deepEqual(result.pagination, {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
        });
    });

    it("computes skip from the requested page", async () => {
        await listUrls(
            { page: 3, limit: 10 },
            {
                findPage: async ({ skip, limit }) => {
                    assert.equal(skip, 20);
                    assert.equal(limit, 10);
                    return [];
                },
                countUrls: async () => 25
            }
        );
    });
});

describe("updateUrl", () => {
    const now = new Date("2026-10-12T12:00:00.000Z");

    it("recalculates domain when originalUrl changes", async () => {
        const result = await updateUrl(
            "abc12xy",
            { url: "https://example.com/new" },
            {
                now,
                findUrl: async () => sample,
                saveUpdate: async (shortCode, update) => {
                    assert.equal(shortCode, "abc12xy");
                    assert.equal(update.originalUrl, "https://example.com/new");
                    assert.equal(update.domain, "example.com");
                    assert.equal(update.clicks, undefined);
                    return {
                        ...sample,
                        originalUrl: update.originalUrl,
                        domain: update.domain
                    };
                }
            }
        );

        assert.equal(result.domain, "example.com");
        assert.equal(result.originalUrl, "https://example.com/new");
    });

    it("rejects updates to expired links so they cannot become active", async () => {
        let saveCalls = 0;

        await assert.rejects(
            () => updateUrl(
                "abc12xy",
                { expiresIn: "7d" },
                {
                    now,
                    findUrl: async () => ({
                        ...sample,
                        expiresAt: new Date("2026-10-01T00:00:00.000Z")
                    }),
                    saveUpdate: async () => {
                        saveCalls += 1;
                    }
                }
            ),
            (error) => {
                assert.equal(error.statusCode, 410);
                return true;
            }
        );

        assert.equal(saveCalls, 0);
    });

    it("returns 404 when updating a missing URL", async () => {
        await assert.rejects(
            () => updateUrl("missing", { url: "https://example.com" }, {
                now,
                findUrl: async () => null,
                saveUpdate: async () => {}
            }),
            (error) => error.statusCode === 404
        );
    });
});

describe("deactivateUrl", () => {
    it("sets isActive to false without deleting the URL", async () => {
        const result = await deactivateUrl("abc12xy", {
            saveDeactivate: async (shortCode) => {
                assert.equal(shortCode, "abc12xy");
                return {
                    ...sample,
                    isActive: false
                };
            }
        });

        assert.equal(result.isActive, false);
        assert.equal(result.shortCode, "abc12xy");
    });

    it("is safe to deactivate an already inactive URL", async () => {
        const result = await deactivateUrl("abc12xy", {
            saveDeactivate: async () => ({
                ...sample,
                isActive: false
            })
        });

        assert.equal(result.isActive, false);
    });

    it("returns 404 when deactivating a missing URL", async () => {
        await assert.rejects(
            () => deactivateUrl("missing", {
                saveDeactivate: async () => null
            }),
            (error) => error.statusCode === 404
        );
    });
});

describe("deleteUrl", () => {
    it("deletes an existing URL", async () => {
        const result = await deleteUrl("abc12xy", {
            removeUrl: async (shortCode) => {
                assert.equal(shortCode, "abc12xy");
                return sample;
            }
        });

        assert.equal(result.shortCode, "abc12xy");
    });

    it("returns 404 when deleting a missing URL", async () => {
        await assert.rejects(
            () => deleteUrl("missing", { removeUrl: async () => null }),
            (error) => error.statusCode === 404
        );
    });
});
