// routes/chat.js
const express = require("express");
const Room = require("../modals/Room.js");
const Message = require("../modals/Message.js");
const User = require("../modals/Register.js");

const router = express.Router();

// CREATE ROOM
router.post("/room", async (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ message: "Name and userId required" });

    const room = new Room({ name, members: [userId] });
    await room.save();

    // Add room to user's list
    const user = await User.findById(userId);
    user.rooms.push(room._id);
    await user.save();

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// JOIN ROOM
router.post("/room/join", async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.includes(userId)) room.members.push(userId);
    await room.save();

    const user = await User.findById(userId);
    if (!user.rooms.includes(roomId)) user.rooms.push(roomId);
    await user.save();

    res.json({ message: "Joined room", room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ROOMS FOR USER
router.get("/rooms/:userId", async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.params.userId });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET MESSAGES FOR ROOM
router.get("/messages/:roomId", async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username email status")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
