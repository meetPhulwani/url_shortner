const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { extractDomain, buildPublicShortUrl } = require("../utils/url");

describe("extractDomain", () => {
    it("extracts the hostname from an HTTPS URL", () => {
        assert.equal(
            extractDomain("https://youtube.com/watch?v=123"),
            "youtube.com"
        );
    });
});

describe("buildPublicShortUrl", () => {
    it("builds the public short URL from BASE_URL", () => {
        assert.equal(
            buildPublicShortUrl("abc12xy", "http://localhost:3000"),
            "http://localhost:3000/abc12xy"
        );
    });

    it("strips a trailing slash from BASE_URL", () => {
        assert.equal(
            buildPublicShortUrl("abc12xy", "http://localhost:3000/"),
            "http://localhost:3000/abc12xy"
        );
    });
});
