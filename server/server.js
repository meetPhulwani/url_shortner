require("dotenv").config();

const app = require("./app");
const connectDb = require("./config/db");

const start = async () => {
    await connectDb();

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
        console.log(`server running on ${PORT}`);
    });
};

start();
