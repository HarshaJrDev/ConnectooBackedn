const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" }, // for group messages
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for direct messages
  text: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
