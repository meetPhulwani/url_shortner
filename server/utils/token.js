const jwt = require("jsonwebtoken");
const { getJwtAlgorithm, getJwtExpiresIn, getJwtSecret } = require("../config/auth");

const signAccessToken = (userId) => jwt.sign(
    {},
    getJwtSecret(),
    {
        algorithm: getJwtAlgorithm(),
        subject: String(userId),
        expiresIn: getJwtExpiresIn()
    }
);

const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret(), {
    algorithms: [getJwtAlgorithm()]
});

module.exports = {
    signAccessToken,
    verifyAccessToken
};
