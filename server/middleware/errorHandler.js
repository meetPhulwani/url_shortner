const { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND } = require("../constants/statusCodes");

const notFoundHandler = (req, res) => {
    res.status(NOT_FOUND).json({
        error: "Route not found."
    });
};

const isMalformedJsonError = (err) => (
    err instanceof SyntaxError
    && err.status === 400
    && Object.prototype.hasOwnProperty.call(err, "body")
);

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (isMalformedJsonError(err)) {
        return res.status(BAD_REQUEST).json({
            error: "Malformed JSON."
        });
    }

    if (err.name === "CastError") {
        return res.status(BAD_REQUEST).json({
            error: "Invalid identifier."
        });
    }

    if (err.name === "ValidationError") {
        return res.status(BAD_REQUEST).json({
            error: "Invalid request data."
        });
    }

    if (err.code === 11000) {
        return res.status(CONFLICT).json({
            error: "Duplicate resource."
        });
    }

    const statusCode = err.statusCode || err.status || INTERNAL_SERVER_ERROR;
    const message = statusCode >= INTERNAL_SERVER_ERROR
        ? "Internal server error."
        : err.message;

    if (process.env.NODE_ENV !== "test" && statusCode >= INTERNAL_SERVER_ERROR) {
        console.error("Request failed", {
            status: statusCode,
            name: err.name
        });
    }

    return res.status(statusCode).json({
        error: message
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
