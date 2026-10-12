const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
    validateShortenInput,
    validatePaginationQuery,
    validateUrlUpdate
} = require("../validators/urlValidator");

describe("validateShortenInput", () => {
    it("rejects a missing URL", () => {
        assert.equal(
            validateShortenInput({ expiresIn: "7d" }),
            "URL is required."
        );
    });

    it("rejects a malformed URL", () => {
        assert.equal(
            validateShortenInput({ url: "not-a-url", expiresIn: "7d" }),
            "URL must be a valid HTTP or HTTPS URL."
        );
    });

    it("rejects unsupported protocols", () => {
        assert.equal(
            validateShortenInput({ url: "ftp://example.com", expiresIn: "7d" }),
            "URL must be a valid HTTP or HTTPS URL."
        );
    });

    it("rejects a missing expiration", () => {
        assert.equal(
            validateShortenInput({ url: "https://youtube.com/watch?v=123" }),
            "expiresIn is required."
        );
    });

    it("rejects an unsupported expiration", () => {
        assert.equal(
            validateShortenInput({
                url: "https://youtube.com/watch?v=123",
                expiresIn: "2d"
            }),
            "expiresIn must be one of: 1h, 6h, 1d, 3d, 7d, 15d, 30d."
        );
    });

    it("accepts a valid HTTP URL and expiration", () => {
        assert.equal(
            validateShortenInput({
                url: "http://example.com",
                expiresIn: "1h"
            }),
            null
        );
    });

    it("accepts a valid HTTPS URL and expiration", () => {
        assert.equal(
            validateShortenInput({
                url: "https://youtube.com/watch?v=123",
                expiresIn: "7d"
            }),
            null
        );
    });
});

describe("validatePaginationQuery", () => {
    it("defaults to page 1 and limit 10", () => {
        assert.deepEqual(validatePaginationQuery({}), {
            page: 1,
            limit: 10
        });
    });

    it("rejects a non-integer page", () => {
        assert.deepEqual(validatePaginationQuery({ page: "abc" }), {
            error: "page must be a positive integer."
        });
    });

    it("rejects a page less than 1", () => {
        assert.deepEqual(validatePaginationQuery({ page: "0" }), {
            error: "page must be a positive integer."
        });
    });

    it("rejects a non-integer limit", () => {
        assert.deepEqual(validatePaginationQuery({ limit: "nope" }), {
            error: "limit must be a positive integer."
        });
    });

    it("rejects a limit above 100", () => {
        assert.deepEqual(validatePaginationQuery({ limit: "101" }), {
            error: "limit cannot be greater than 100."
        });
    });

    it("accepts the maximum limit of 100", () => {
        assert.deepEqual(validatePaginationQuery({ limit: "100" }), {
            page: 1,
            limit: 100
        });
    });
});

describe("validateUrlUpdate", () => {
    it("rejects an empty body", () => {
        assert.equal(validateUrlUpdate({}).error, "No updatable fields provided.");
    });

    it("rejects protected fields such as clicks and shortCode", () => {
        assert.equal(
            validateUrlUpdate({ clicks: 99 }).error,
            "Unsupported field: clicks"
        );
        assert.equal(
            validateUrlUpdate({ shortCode: "hacked1" }).error,
            "Unsupported field: shortCode"
        );
    });

    it("rejects an invalid replacement URL", () => {
        assert.equal(
            validateUrlUpdate({ url: "ftp://example.com" }).error,
            "URL must be a valid HTTP or HTTPS URL."
        );
    });

    it("accepts a valid URL and expiration", () => {
        assert.deepEqual(
            validateUrlUpdate({
                url: "https://example.com/new",
                expiresIn: "1d"
            }),
            {
                url: "https://example.com/new",
                expiresIn: "1d"
            }
        );
    });
});
