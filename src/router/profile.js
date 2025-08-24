const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const auth = require("../middleware/auth");
const User = require("../modals/Register");

const router = express.Router();

// Cloudinary storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "chatapp/avatars", allowed_formats: ["jpg", "jpeg", "png"] }
});
const parser = multer({ storage });

// Update profile (username/email/password/avatar)
router.put("/", auth, parser.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, email, password } = req.body;

    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (req.file) user.avatar = req.file.path;

    await user.save();

    res.json({
      message: "Profile updated",
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
