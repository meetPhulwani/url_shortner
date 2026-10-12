const DEFAULT_SHORT_CODE_LENGTH = 7;

const generateShortCode = async (length = DEFAULT_SHORT_CODE_LENGTH) => {
    const { nanoid } = await import("nanoid");
    return nanoid(length);
};

module.exports = {
    DEFAULT_SHORT_CODE_LENGTH,
    generateShortCode
};
