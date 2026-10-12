const { BAD_REQUEST, CREATED, OK } = require("../constants/statusCodes");
const { loginUser, registerUser } = require("../services/authService");
const { validateLoginInput, validateRegisterInput } = require("../validators/authValidator");

const register = async (req, res) => {
    const input = validateRegisterInput(req.body);

    if (input.error) {
        return res.status(BAD_REQUEST).json({
            error: input.error
        });
    }

    const user = await registerUser(input);

    return res.status(CREATED).json({
        user
    });
};

const login = async (req, res) => {
    const input = validateLoginInput(req.body);

    if (input.error) {
        return res.status(BAD_REQUEST).json({
            error: input.error
        });
    }

    const result = await loginUser(input);

    return res.status(OK).json(result);
};

module.exports = {
    register,
    login
};
