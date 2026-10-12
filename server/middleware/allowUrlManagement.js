const { NOT_FOUND } = require("../constants/statusCodes");

const allowUrlManagement = (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
        return res.status(NOT_FOUND).json({
            error: "Route not found."
        });
    }

    if (process.env.ENABLE_URL_MANAGEMENT !== "true") {
        return res.status(NOT_FOUND).json({
            error: "URL management is disabled."
        });
    }

    return next();
};

module.exports = {
    allowUrlManagement
};
