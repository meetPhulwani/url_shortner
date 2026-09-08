require("dotenv").config();

const { connect } = require("mongoose");
const app = require("./app");
const connectDb = require("./config/db");
const urlRoutes = require("./routes/urlRoutes");
const express = require('express');

app.use(express.json());

app.use("/", urlRoutes);

app.get("/", (req, res) => {
    res.send("Hello");
});

connectDb();

const PORT = process.env.PORT
app.listen(PORT , () => {
    console.log(`server running on ${PORT}`)
})