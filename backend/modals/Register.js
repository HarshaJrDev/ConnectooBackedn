const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  status: { type: String, enum: ["offline", "online"], default: "offline" },
  friends: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ["pending", "accepted"], default: "pending" }
    }
  ],
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
