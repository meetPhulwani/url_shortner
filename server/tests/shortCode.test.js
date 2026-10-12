const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generateShortCode, DEFAULT_SHORT_CODE_LENGTH } = require("../utils/shortCode");

describe("generateShortCode", () => {
    it("generates a URL-safe NanoID of the expected length", async () => {
        const shortCode = await generateShortCode();

        assert.equal(shortCode.length, DEFAULT_SHORT_CODE_LENGTH);
        assert.match(shortCode, /^[A-Za-z0-9_-]+$/);
    });
});
