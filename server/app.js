const express = require("express");
const urlRoutes = require("./routes/urlRoutes");
const urlManagementRoutes = require("./routes/urlManagementRoutes");
const authRoutes = require("./routes/authRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello");
});

app.use("/api/auth", authRoutes);
app.use("/api/urls", urlManagementRoutes);
app.use("/", urlRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
