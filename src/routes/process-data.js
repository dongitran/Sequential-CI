const express = require("express");
const router = express.Router();
const ProcessDataController = require("../controllers/process-data");

router.post("/", ProcessDataController.createData);
router.put("/", ProcessDataController.updateDataByName);

module.exports = router;
