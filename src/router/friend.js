const express = require("express");
const User = require("../modals/Register.js");
const auth = require("../middleware/auth");

const router = express.Router();

// Send friend request
router.post("/:id", auth, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const toUserId = req.params.id;

    if (fromUserId === toUserId)
      return res.status(400).json({ message: "You cannot add yourself" });

    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) return res.status(404).json({ message: "User not found" });

    if (!fromUser.friends.some(f => f.userId.toString() === toUserId)) {
      fromUser.friends.push({ userId: toUserId, status: "pending" });
    }
    if (!toUser.friends.some(f => f.userId.toString() === fromUserId)) {
      toUser.friends.push({ userId: fromUserId, status: "pending" });
    }

    await fromUser.save();
    await toUser.save();

    res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).json({ error: "Failed to send friend request", details: err.message });
  }
});

// Accept friend request
router.put("/accept/:id", auth, async (req, res) => {
  try {
    const fromUserId = req.params.id; // sender
    const toUserId = req.user.id;     // receiver

    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) return res.status(404).json({ message: "User not found" });

    fromUser.friends = fromUser.friends.map(f =>
      f.userId.toString() === toUserId ? { ...f.toObject(), status: "accepted" } : f
    );
    toUser.friends = toUser.friends.map(f =>
      f.userId.toString() === fromUserId ? { ...f.toObject(), status: "accepted" } : f
    );

    await fromUser.save();
    await toUser.save();

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    res.status(500).json({ error: "Failed to accept friend request", details: err.message });
  }
});

// Get pending friend requests
router.get("/requests/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("friends.userId", "username email status avatar");
    if (!user) return res.status(404).json({ message: "User not found" });

    const pending = user.friends.filter(f => f.status === "pending");
    res.json(pending);
  } catch (err) {
    console.error("Error fetching friend requests:", err);
    res.status(500).json({ error: "Failed to fetch friend requests", details: err.message });
  }
});

// Get online friends
router.get("/online", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends.userId", "username email status avatar");
    if (!user) return res.status(404).json({ message: "User not found" });

    const onlineFriends = user.friends
      .filter(f => f.status === "accepted" && f.userId.status === "online")
      .map(f => f.userId);

    res.json(onlineFriends);
  } catch (err) {
    console.error("Error fetching online friends:", err);
    res.status(500).json({ error: "Failed to fetch online friends", details: err.message });
  }
});

// userRoutes.js
router.get("/friends", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friends.userId",
      "username email status avatar"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const friendsList = user.friends
      .filter(f => f.status === "accepted")
      .map(f => f.userId);

    res.json(friendsList);
  } catch (err) {
    console.error("Error fetching friends list:", err);
    res.status(500).json({ error: "Failed to fetch friends list", details: err.message });
  }
});


module.exports = router;
