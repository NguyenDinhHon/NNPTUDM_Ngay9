const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    to: {
      type: mongoose.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    messageContent: {
      type: {
        type: String,
        enum: ['file', 'text'],
        required: true,
      },
      text: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true, // use createdAt for sorting messages
  }
);

module.exports = new mongoose.model('message', messageSchema);

