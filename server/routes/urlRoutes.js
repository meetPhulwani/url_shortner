const express = require("express");
const { createShortUrl, redirectShortUrl } = require("../controllers/urlController");

const router = express.Router();

router.post("/shorten", createShortUrl);
router.get("/:shortCode", redirectShortUrl);

module.exports = router