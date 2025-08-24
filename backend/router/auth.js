const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary"); // Update to correct path if needed
const User = require("../modals/Register.js"); // Mongoose User model
const auth = require("../middleware/auth");

const router = express.Router();

// -------------------
// Cloudinary storage (for avatar uploads)
// -------------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chatapp/avatars",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});
const parser = multer({ storage });

// -------------------
// REGISTER
// -------------------
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    console.log("📥 Register Request Body:", req.body);

    if (!username || !email || !password) {
      console.error("❌ Register Error: Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error("❌ Register Error: User already exists");
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar: avatar || "",
      status: "offline",
      friends: [],
      rooms: [],
    });

    await newUser.save();
    console.log("✅ User Registered:", newUser);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        status: newUser.status,
        avatar: newUser.avatar,
        friends: newUser.friends,
        rooms: newUser.rooms,
      },
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// LOGIN
// -------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("📥 Login Request:", req.body);

    if (!email || !password) {
      console.error("❌ Login Error: Missing fields");
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).populate(
      "friends.userId",
      "username email status avatar"
    );
    if (!user) {
      console.error("❌ Login Error: User not found");
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("❌ Login Error: Invalid credentials");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    user.status = "online";
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    console.log("✅ Login Success:", user.email);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status,
        avatar: user.avatar,
        friends: user.friends,
        rooms: user.rooms,
      },
    });
  } catch (err) {
    console.error("❌ Login Error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// UPDATE PROFILE (supports avatar file or body URL)
// -------------------
router.put("/profile", auth, parser.single("avatar"), async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    console.log("📥 Profile Update Body:", req.body);
    console.log("📂 File Upload:", req.file ? req.file.path : "No file uploaded");

    const user = await User.findById(req.user.id);
    if (!user) {
      console.error("❌ Profile Update Error: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (username) user.username = username;
    if (email) user.email = email;

    // If avatar file uploaded, use Cloudinary URL
    if (req.file) {
      user.avatar = req.file.path;
      console.log("✅ Avatar Updated (via file):", user.avatar);
    } else if (avatar) { // If avatar URL provided in body
      user.avatar = avatar;
      console.log("✅ Avatar Updated (via URL):", user.avatar);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        friends: user.friends,
        rooms: user.rooms,
      },
    });
  } catch (err) {
    console.error("❌ Profile Update Error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// LOGOUT
// -------------------
router.post("/logout", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      console.error("❌ Logout Error: User not found");
      return res.status(400).json({ message: "User not found" });
    }

    user.status = "offline";
    await user.save();

    console.log("👋 User Logged Out:", user.email);

    res.json({ message: "User logged out successfully" });
  } catch (err) {
    console.error("❌ Logout Error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// GET PROFILE DETAILS
// -------------------
router.get("/me", auth, async (req, res) => {
  try {
    console.log("📥 Profile Fetch Request for UserID:", req.user.id);

    const user = await User.findById(req.user.id)
      .populate("friends.userId", "username email status avatar")
      .populate("rooms", "name description");

    if (!user) {
      console.error("❌ Profile Fetch Error: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Profile Details:", {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      friends: user.friends,
      rooms: user.rooms,
    });

    res.json({
      message: "Profile fetched successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        friends: user.friends,
        rooms: user.rooms,
      },
    });
  } catch (err) {
    console.error("❌ Profile Fetch Error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
