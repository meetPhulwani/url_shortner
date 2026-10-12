const express = require("express");
const {
    getUrl,
    listUrls,
    updateUrl,
    deactivateUrl,
    deleteUrl
} = require("../controllers/urlManagementController");

const router = express.Router();

router.get("/", listUrls);
router.get("/:shortCode", getUrl);
router.patch("/:shortCode/deactivate", deactivateUrl);
router.patch("/:shortCode", updateUrl);
router.delete("/:shortCode", deleteUrl);

module.exports = router;
