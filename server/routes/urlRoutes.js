const express = require("express");
const { createShortUrl, redirectShortUrl } = require("../controllers/urlController");
const { optionalAuthenticate } = require("../middleware/authenticate");

const router = express.Router();

router.post("/shorten", optionalAuthenticate, createShortUrl);
router.get("/:shortCode", redirectShortUrl);

module.exports = router