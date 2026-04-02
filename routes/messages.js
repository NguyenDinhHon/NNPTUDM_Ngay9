var express = require('express');
var router = express.Router();

const mongoose = require('mongoose');
let messageModel = require('../schemas/messages');
const { checkLogin } = require('../utils/authHandler');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    let namefile = Date.now() + "-" + Math.round(Math.random() * 2E9) + ext;
    cb(null, namefile);
  }
});

// Lưu file upload vào uploads/, trường file: req.file
const upload = multer({
  storage: storage,
  limits: 5 * 1024 * 1024, // 5MB
});

// Lấy toàn bộ message 2 chiều giữa user hiện tại và userID
router.get('/', checkLogin, async function (req, res, next) {
  try {
    const currentUserId = req.user._id;

    // Lấy message mới nhất cho từng "đối tác" (otherUserId)
    // - Nếu message.from là currentUserId => otherUserId = message.to
    // - Ngược lại => otherUserId = message.from
    const lastMessages = await messageModel.aggregate([
      {
        $match: {
          $or: [{ from: currentUserId }, { to: currentUserId }],
        },
      },
      {
        $project: {
          otherUserId: {
            $cond: [{ $eq: ['$from', currentUserId] }, '$to', '$from'],
          },
          from: 1,
          to: 1,
          messageContent: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$lastMessage' },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.send(lastMessages);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

router.get('/:userID', checkLogin, async function (req, res, next) {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userID;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).send({ message: 'Invalid userID' });
    }

    const messages = await messageModel
      .find({
        $or: [
          { from: currentUserId, to: otherUserId },
          { from: otherUserId, to: currentUserId },
        ],
      })
      .sort({ createdAt: 1 });

    res.send(messages);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Gửi message (text hoặc file) tới user đích
// Endpoint: POST /api/v1/messages
// Body:
// - to: userID
// - text: nội dung (khi không có file)
// multipart/form-data (optional file): field name = "file"
router.post('/', checkLogin, upload.single('file'), async function (req, res, next) {
  try {
    const from = req.user._id;
    const to = req.body.to;

    if (!mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).send({ message: 'Invalid to userID' });
    }

    let messageContent;
    if (req.file) {
      // Nếu có file: type=file, text=path file
      messageContent = {
        type: 'file',
        text: req.file.path,
      };
    } else {
      // Nếu không có file: bắt buộc có text nội dung
      const text = req.body.text;
      if (!text || typeof text !== 'string') {
        return res.status(400).send({ message: 'Missing text content' });
      }
      messageContent = {
        type: 'text',
        text: text,
      };
    }

    const newMessage = await messageModel({
      from,
      to,
      messageContent,
    }).save();

    res.send(newMessage);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;

