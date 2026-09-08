const express = require("express");
const {createShortUrl} = require('../controllers/urlController');

const router = express.Router();

router.post("/shorten" , createShortUrl);

module.exports = router