let messageModel = require('../schemas/messages');

module.exports = {
  // GET /api/v1/messages
  // Trả về message mới nhất cho từng "đối tác" của user hiện tại
  async getLastMessages(req, res, next) {
    try {
      const currentUserId = req.user._id;

      // Cách đơn giản:
      // - Lấy toàn bộ message có liên quan tới currentUserId
      // - Sort mới nhất trước
      // - Duyệt và lấy message đầu tiên cho mỗi đối tác (tức là message cuối)
      const messages = await messageModel
        .find({
          $or: [{ from: currentUserId }, { to: currentUserId }],
        })
        .sort({ createdAt: -1 });

      const map = new Map(); // otherUserId(string) -> message(mongoose doc)
      for (const msg of messages) {
        const isCurrentUserSender = msg.from && msg.from.toString() === currentUserId.toString();
        const otherUserId = isCurrentUserSender ? msg.to : msg.from;
        const otherKey = otherUserId ? otherUserId.toString() : null;

        if (otherKey && !map.has(otherKey)) {
          map.set(otherKey, msg);
        }
      }

      res.send(Array.from(map.values()));
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  },

  // GET /api/v1/messages/:userID
  // Lấy toàn bộ message 2 chiều giữa user hiện tại và userID
  async getConversation(req, res, next) {
    try {
      const currentUserId = req.user._id;
      const otherUserId = req.params.userID;

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
      // Trường hợp to/userID không phải ObjectId hợp lệ thường sẽ là CastError
      if (err && err.name === 'CastError') {
        return res.status(400).send({ message: 'Invalid userID' });
      }
      res.status(500).send({ message: err.message });
    }
  },

  // POST /api/v1/messages
  // Body (form-data):
  // - to: userID
  // - text: (khi không có file)
  // - file: (optional) field name = "file"
  async postMessage(req, res, next) {
    try {
      const from = req.user._id;
      const to = req.body.to;

      if (!to) {
        return res.status(400).send({ message: 'Missing to userID' });
      }

      let messageContent;
      if (req.file) {
        // Theo schema: type='file', text='path dẫn đến file'
        messageContent = {
          type: 'file',
          text: req.file.path,
        };
      } else {
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
      if (err && err.name === 'CastError') {
        return res.status(400).send({ message: 'Invalid to userID' });
      }
      res.status(500).send({ message: err.message });
    }
  },
};

