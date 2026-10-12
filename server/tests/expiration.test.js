const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { getExpiresAt, isExpired } = require("../utils/expiration");

describe("getExpiresAt", () => {
    const now = new Date("2026-10-12T00:00:00.000Z");

    it("converts 1h into a real Date", () => {
        assert.equal(
            getExpiresAt("1h", now).toISOString(),
            "2026-10-12T01:00:00.000Z"
        );
    });

    it("converts 7d into a real Date", () => {
        assert.equal(
            getExpiresAt("7d", now).toISOString(),
            "2026-10-19T00:00:00.000Z"
        );
    });

    it("converts 30d into a real Date", () => {
        assert.equal(
            getExpiresAt("30d", now).toISOString(),
            "2026-11-11T00:00:00.000Z"
        );
    });
});

describe("isExpired", () => {
    const now = new Date("2026-10-12T00:00:00.000Z");

    it("treats a null expiration as not expired", () => {
        assert.equal(isExpired(null, now), false);
    });

    it("treats a future expiration as not expired", () => {
        assert.equal(isExpired(new Date("2026-10-12T00:00:01.000Z"), now), false);
    });

    it("treats an equal expiration as expired", () => {
        assert.equal(isExpired(now, now), true);
    });

    it("treats a past expiration as expired", () => {
        assert.equal(isExpired(new Date("2026-10-11T23:59:59.000Z"), now), true);
    });
});
