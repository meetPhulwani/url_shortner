const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
    getUrlByShortCode,
    listUrls,
    updateUrl,
    deactivateUrl,
    deleteUrl
} = require("../services/urlManagementService");

const ownerId = "user-a";
const sample = {
    shortCode: "abc12xy",
    originalUrl: "https://youtube.com/watch?v=123",
    domain: "youtube.com",
    clicks: 4,
    isActive: true,
    expiresAt: new Date("2026-10-19T00:00:00.000Z"),
    createdAt: new Date("2026-10-12T00:00:00.000Z"),
    updatedAt: new Date("2026-10-12T00:00:00.000Z"),
    userId: ownerId,
    _id: "internal-id",
    __v: 0
};

describe("getUrlByShortCode", () => {
    it("returns public metadata for an existing URL", async () => {
        const result = await getUrlByShortCode("abc12xy", ownerId, {
            findUrl: async (shortCode, userId) => {
                assert.equal(shortCode, "abc12xy");
                assert.equal(userId, ownerId);
                return sample;
            }
        });

        assert.equal(result.shortCode, "abc12xy");
        assert.equal(result.originalUrl, sample.originalUrl);
        assert.equal(result.clicks, 4);
        assert.equal(result._id, undefined);
        assert.equal(result.__v, undefined);
        assert.equal(result.userId, undefined);
    });

    it("returns 404 when the URL does not exist", async () => {
        await assert.rejects(
            () => getUrlByShortCode("missing", ownerId, { findUrl: async () => null }),
            (error) => {
                assert.equal(error.statusCode, 404);
                assert.match(error.message, /not found/i);
                return true;
            }
        );
    });

    it("returns 404 for a URL owned by another user or a legacy unowned URL", async () => {
        await assert.rejects(
            () => getUrlByShortCode("abc12xy", ownerId, { findUrl: async () => null }),
            (error) => error.statusCode === 404
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
            { page: 1, limit: 10, userId: ownerId },
            {
                findPage: async ({ skip, limit, sort, userId }) => {
                    assert.equal(skip, 0);
                    assert.equal(limit, 10);
                    assert.equal(userId, ownerId);
                    assert.deepEqual(sort, { createdAt: -1, shortCode: 1 });
                    return docs;
                },
                countUrls: async (userId) => {
                    assert.equal(userId, ownerId);
                    return 2;
                }
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
            { page: 3, limit: 10, userId: ownerId },
            {
                findPage: async ({ skip, limit, userId }) => {
                    assert.equal(skip, 20);
                    assert.equal(limit, 10);
                    assert.equal(userId, ownerId);
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
            ownerId,
            { url: "https://example.com/new" },
            {
                now,
                findUrl: async (shortCode, userId) => {
                    assert.equal(userId, ownerId);
                    return sample;
                },
                saveUpdate: async (shortCode, userId, update) => {
                    assert.equal(shortCode, "abc12xy");
                    assert.equal(userId, ownerId);
                    assert.equal(update.originalUrl, "https://example.com/new");
                    assert.equal(update.domain, "example.com");
                    assert.equal(update.clicks, undefined);
                    assert.equal(update.userId, undefined);
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
                ownerId,
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
            () => updateUrl("missing", ownerId, { url: "https://example.com" }, {
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
        const result = await deactivateUrl("abc12xy", ownerId, {
            saveDeactivate: async (shortCode, userId) => {
                assert.equal(shortCode, "abc12xy");
                assert.equal(userId, ownerId);
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
        const result = await deactivateUrl("abc12xy", ownerId, {
            saveDeactivate: async () => ({
                ...sample,
                isActive: false
            })
        });

        assert.equal(result.isActive, false);
    });

    it("returns 404 when deactivating a missing URL", async () => {
        await assert.rejects(
            () => deactivateUrl("missing", ownerId, {
                saveDeactivate: async () => null
            }),
            (error) => error.statusCode === 404
        );
    });
});

describe("deleteUrl", () => {
    it("deletes an existing URL", async () => {
        const result = await deleteUrl("abc12xy", ownerId, {
            removeUrl: async (shortCode, userId) => {
                assert.equal(shortCode, "abc12xy");
                assert.equal(userId, ownerId);
                return sample;
            }
        });

        assert.equal(result.shortCode, "abc12xy");
    });

    it("returns 404 when deleting a missing URL", async () => {
        await assert.rejects(
            () => deleteUrl("missing", ownerId, { removeUrl: async () => null }),
            (error) => error.statusCode === 404
        );
    });
});
