require("dotenv").config();

const { connect } = require("mongoose");
const app = require("./app");
const connectDb = require("./config/db");


app.get("/", (req, res) => {
    res.send("Hello");
});

connectDb();

const PORT = process.env.PORT
app.listen(PORT , () => {
    console.log(`server running on ${PORT}`)
})