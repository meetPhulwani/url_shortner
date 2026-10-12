const validator = require("validator");

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 100;

const normalizeEmail = (email) => {
    if (typeof email !== "string") {
        return "";
    }

    return email.trim().toLowerCase();
};

const validateRegisterInput = ({ name, email, password } = {}) => {
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
        return { error: "Name is required." };
    }

    if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
        return { error: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.` };
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return { error: "Email is required." };
    }

    if (!validator.isEmail(normalizedEmail)) {
        return { error: "Email must be a valid email address." };
    }

    if (typeof password !== "string" || !password) {
        return { error: "Password is required." };
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        return {
            error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
        };
    }

    return {
        name: trimmedName,
        email: normalizedEmail,
        password
    };
};

const validateLoginInput = ({ email, password } = {}) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof password !== "string" || !password) {
        return { error: "Email and password are required." };
    }

    return {
        email: normalizedEmail,
        password
    };
};

module.exports = {
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
    normalizeEmail,
    validateRegisterInput,
    validateLoginInput
};
