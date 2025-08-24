const express = require("express");
const Message = require("../modals/Message.js"); // <-- correct path!
const auth = require("../middleware/auth");      // token check middleware

const router = express.Router();

// -------------
// SEND MESSAGE (direct/1-on-1)
// -------------
router.post("/send", auth, async (req, res) => {
  try {
    const { receiver, text } = req.body;
    if (!text) {
      console.warn("[MESSAGE SEND] Missing text");
      return res.status(400).json({ message: "Message text is required" });
    }

    const newMessage = new Message({
      sender: req.user.id,
      receiver,
      text,
    });
    await newMessage.save();

    // 🔥 Emit to sender + receiver if Socket.io is available
    const io = req.app.get("io");
    if (io) {
      io.to(req.user.id).to(receiver).emit("receive_message", newMessage);
      console.log(`[MESSAGE SEND] Emitted to: ${req.user.id} and ${receiver}`);
    }

    console.log("[MESSAGE SEND] Success:", {
      sender: req.user.id,
      receiver,
      text,
      id: newMessage._id,
    });

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("[MESSAGE SEND] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------
// GET CHAT HISTORY with another user
// -------------
router.get("/history/:userId", auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`[MESSAGE HISTORY] Get conversation: AuthUser: ${req.user.id} <-> Peer: ${userId}`);

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    }).sort({ createdAt: 1 }); // oldest first

    res.json(messages);
  } catch (err) {
    console.error("[MESSAGE HISTORY] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
