const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
    normalizeEmail,
    validateLoginInput,
    validateRegisterInput
} = require("../validators/authValidator");

describe("normalizeEmail", () => {
    it("trims and lowercases email", () => {
        assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
    });
});

describe("validateRegisterInput", () => {
    it("accepts valid registration input", () => {
        assert.deepEqual(
            validateRegisterInput({
                name: " Example User ",
                email: "User@Example.com",
                password: "a-strong-example-password"
            }),
            {
                name: "Example User",
                email: "user@example.com",
                password: "a-strong-example-password"
            }
        );
    });

    it("rejects missing fields", () => {
        assert.equal(validateRegisterInput({}).error, "Name is required.");
        assert.equal(
            validateRegisterInput({ name: "Ada" }).error,
            "Email is required."
        );
        assert.equal(
            validateRegisterInput({
                name: "Ada",
                email: "ada@example.com"
            }).error,
            "Password is required."
        );
    });

    it("rejects an invalid email", () => {
        assert.equal(
            validateRegisterInput({
                name: "Ada",
                email: "not-an-email",
                password: "a-strong-example-password"
            }).error,
            "Email must be a valid email address."
        );
    });

    it("rejects a short password", () => {
        assert.match(
            validateRegisterInput({
                name: "Ada",
                email: "ada@example.com",
                password: "short"
            }).error,
            /between 8 and 72/
        );
    });
});

describe("validateLoginInput", () => {
    it("normalizes email on login", () => {
        assert.deepEqual(
            validateLoginInput({
                email: "  User@Example.com ",
                password: "a-strong-example-password"
            }),
            {
                email: "user@example.com",
                password: "a-strong-example-password"
            }
        );
    });

    it("rejects missing credentials", () => {
        assert.equal(
            validateLoginInput({ email: "ada@example.com" }).error,
            "Email and password are required."
        );
    });
});
