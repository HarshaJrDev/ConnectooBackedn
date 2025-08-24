// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketio = require("socket.io");

// Routers
const authRoutes = require("./router/auth.js");
const messageRoutes = require("./router/message.js");
const chatRoutes = require("./router/chat.js");
const friendRoutes = require("./router/friend.js");

// Models
const Message = require("./modals/Message.js");
const User = require("./modals/Register.js");

const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: "*" } });

// Make io accessible in routes
app.set("io", io);

// -------------------
// Middleware
// -------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form submissions

// -------------------
// Routes
// -------------------
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/friends", friendRoutes);

app.get("/", (req, res) => res.send("API running"));

// Get all users (excluding password)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("User List Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// Socket.io
// -------------------
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Register user to their personal room for direct messages
  socket.on("register_user", (userId) => {
    socket.join(userId);
    console.log(`🔹 User ${userId} joined personal room`);
  });

  // Join a room
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`🔹 Socket ${socket.id} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
    console.log(`🔹 Socket ${socket.id} left room ${roomId}`);
  });

  // Room message
  socket.on("send_room_message", async (data) => {
    try {
      const { roomId, senderId, text } = data;
      if (!roomId || !senderId || !text) return;

      const message = new Message({ room: roomId, sender: senderId, text });
      await message.save();
      const populatedMsg = await message.populate("sender", "username status");

      io.to(roomId).emit("receive_room_message", populatedMsg);
    } catch (err) {
      console.error("Socket Room Error:", err);
    }
  });

  // Direct 1-on-1 message
socket.on("send_direct_message", async (data) => {
  try {
    const { senderId, receiverId, text } = data;
    if (!senderId || !receiverId || !text) return;

    // Save message in DB
    const message = new Message({ sender: senderId, receiver: receiverId, text });
    await message.save();

    // Populate sender info
    const populatedMsg = await message.populate("sender", "username status");

    // Emit to receiver only (sender already knows they sent it)
    io.to(receiverId).emit("receive_direct_message", populatedMsg);

    // Optionally, emit back to sender so client can confirm delivery
    // Use socket.emit to avoid double delivery
  

    console.log("📩 Direct message sent:", populatedMsg);
  } catch (err) {
    console.error("Socket Direct Error:", err);
  }
});


  socket.on("disconnect", () => console.log("❌ User disconnected:", socket.id));
});

// -------------------
// MongoDB connection
// -------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// -------------------
// Start server
// -------------------
const PORT = process.env.PORT || 2000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
