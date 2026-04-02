var express = require('express');
var router = express.Router();

const { checkLogin } = require('../utils/authHandler');
const { uploadAttachment } = require('../utils/uploadHandler');
const messageController = require('../controllers/messages');

// GET: Lấy message mới nhất cho từng đối tác của user hiện tại
router.get('/', checkLogin, messageController.getLastMessages);

// GET: Lấy toàn bộ message 2 chiều giữa user hiện tại và userID
router.get('/:userID', checkLogin, messageController.getConversation);

// POST: Gửi message text hoặc file
// Body (form-data):
// - to: userID
// - text: nội dung (khi không có file)
// - file: (optional) gửi file, field name = "file"
router.post('/', checkLogin, uploadAttachment.single('file'), messageController.postMessage);

module.exports = router;

