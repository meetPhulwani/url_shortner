process.env.NODE_ENV = "test";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { errorHandler, notFoundHandler } = require("../middleware/errorHandler");

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

describe("errorHandler", () => {
    it("returns a consistent JSON error for known HTTP errors", () => {
        const err = new Error("Short URL not found.");
        err.statusCode = 404;
        const res = mockResponse();

        errorHandler(err, {}, res, () => {});

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: "Short URL not found." });
    });

    it("handles malformed JSON", () => {
        const err = new SyntaxError("Unexpected token");
        err.status = 400;
        err.body = "{";
        const res = mockResponse();

        errorHandler(err, {}, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error, "Malformed JSON.");
    });

    it("handles invalid Mongoose ObjectIds", () => {
        const err = new Error("Cast to ObjectId failed");
        err.name = "CastError";
        const res = mockResponse();

        errorHandler(err, {}, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error, "Invalid identifier.");
    });

    it("does not expose database details on unexpected failures", () => {
        const err = new Error("ECONNREFUSED mongodb://user:secret@cluster.mongodb.net/urlShortener");
        const res = mockResponse();

        errorHandler(err, {}, res, () => {});

        assert.equal(res.statusCode, 500);
        assert.equal(res.body.error, "Internal server error.");
        assert.equal(res.body.stack, undefined);
        assert.doesNotMatch(JSON.stringify(res.body), /mongodb/i);
        assert.doesNotMatch(JSON.stringify(res.body), /secret/i);
    });
});

describe("notFoundHandler", () => {
    it("returns JSON 404 for unknown routes", () => {
        const res = mockResponse();

        notFoundHandler({}, res);

        assert.equal(res.statusCode, 404);
        assert.equal(res.body.error, "Route not found.");
    });
});
