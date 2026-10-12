require("dotenv").config();

const app = require("./app");
const { validateAuthConfig } = require("./config/auth");
const connectDb = require("./config/db");

const start = async () => {
    validateAuthConfig();
    await connectDb();

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
        console.log(`server running on ${PORT}`);
    });
};

start();
