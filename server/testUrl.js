require("dotenv").config();

const mongoose = require("mongoose");
const Url = require("./models/Url");

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const url = new Url({
            originalUrl: "https://youtube.com",
            shortCode: "abc12",
            domain: "youtube.com"
        });

        const savedUrl = await url.save();

        console.log(savedUrl);

        await mongoose.connection.close();
    } catch (error) {
        console.error(error);
    }
};

test();