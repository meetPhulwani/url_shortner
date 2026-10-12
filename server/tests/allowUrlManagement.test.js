const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { allowUrlManagement } = require("../middleware/allowUrlManagement");

const mockResponse = () => {
    const res = {
        headersSent: false,
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };

    return res;
};

describe("allowUrlManagement", () => {
    const previousEnv = {
        NODE_ENV: process.env.NODE_ENV,
        ENABLE_URL_MANAGEMENT: process.env.ENABLE_URL_MANAGEMENT
    };

    afterEach(() => {
        process.env.NODE_ENV = previousEnv.NODE_ENV;
        process.env.ENABLE_URL_MANAGEMENT = previousEnv.ENABLE_URL_MANAGEMENT;
    });

    it("allows management routes when explicitly enabled outside production", () => {
        process.env.NODE_ENV = "test";
        process.env.ENABLE_URL_MANAGEMENT = "true";
        let nextCalled = false;

        allowUrlManagement({}, mockResponse(), () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    });

    it("denies management routes when the flag is not set", () => {
        process.env.NODE_ENV = "test";
        delete process.env.ENABLE_URL_MANAGEMENT;
        const res = mockResponse();
        let nextCalled = false;

        allowUrlManagement({}, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 404);
        assert.match(res.body.error, /disabled/i);
    });

    it("denies management routes in production even if the flag is set", () => {
        process.env.NODE_ENV = "production";
        process.env.ENABLE_URL_MANAGEMENT = "true";
        const res = mockResponse();
        let nextCalled = false;

        allowUrlManagement({}, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.error, "Route not found.");
    });
});
