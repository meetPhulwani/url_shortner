const bcrypt = require("bcryptjs");
const { getBcryptRounds } = require("../config/auth");

let dummyHashPromise;

const hashPassword = (plainText) => bcrypt.hash(plainText, getBcryptRounds());

const comparePassword = (plainText, passwordHash) => bcrypt.compare(plainText, passwordHash);

const getDummyPasswordHash = () => {
    if (!dummyHashPromise) {
        dummyHashPromise = bcrypt.hash("timing-dummy-password", getBcryptRounds());
    }

    return dummyHashPromise;
};

module.exports = {
    hashPassword,
    comparePassword,
    getDummyPasswordHash
};
