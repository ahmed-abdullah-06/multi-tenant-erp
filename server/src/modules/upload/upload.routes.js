const express = require('express');
const router = express.Router();
const uploadController = require('./upload.controller');
const { upload } = require('../../middleware/upload.middleware');
const { requireAuth } = require('../../middleware/authMiddleware');

router.use(requireAuth);

// "file" must match the form-data field name sent by the client
router.post('/', upload.single('file'), uploadController.uploadFile);

module.exports = router;