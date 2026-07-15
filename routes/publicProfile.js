const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/user");
const { checkForAuthenticationCookie } = require("../middlewares/authentication");

// ====================== GET PUBLIC PROFILE ======================
// Anyone can view - no login required
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(404).render("404", { user: req.user || null });
        }

        // Fetch profile owner with followers/following populated
        const profileUser = await User.findById(userId)
            .populate("followers", "fullName profileImageURL")
            .populate("following", "fullName profileImageURL")
            .lean();

        if (!profileUser) {
            return res.status(404).render("404", { user: req.user || null });
        }

        // Count stats
        const blogCount = await Blog.countDocuments({ 
            createdBy: userId, 
            isDeleted: false,
            status: "published" 
        });

        // Fetch published blogs
        const blogs = await Blog.find({ 
            createdBy: userId, 
            isDeleted: false,
            status: "published" 
        })
            .sort({ createdAt: -1 })
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        // Determine visibility of followers/following lists
        let showFollowersList = false;
        let showFollowingList = false;
        let isFollowing = false;
        let isMutualFollow = false;
        let isOwner = false;

        if (req.user) {
            isOwner = req.user._id.toString() === userId.toString();

            // Check if logged-in user follows this profile
            const currentUser = await User.findById(req.user._id).lean();
            isFollowing = currentUser.following.some(id => id.toString() === userId);

            // Check if mutual follow (both follow each other)
            const profileFollowsMe = profileUser.followers.some(
                f => f._id.toString() === req.user._id.toString()
            );
            isMutualFollow = isFollowing && profileFollowsMe;

            // Show followers/following list if:
            // 1. Viewer is the owner, OR
            // 2. Viewer and profile owner are mutual followers
            showFollowersList = isOwner || isMutualFollow;
            showFollowingList = isOwner || isMutualFollow;
        }

        // Prepare visible lists
        let visibleFollowers = [];
        let visibleFollowing = [];

        if (showFollowersList) {
            visibleFollowers = profileUser.followers;
        }

        if (showFollowingList) {
            visibleFollowing = profileUser.following;
        }

        res.render("publicProfile", {
            user: req.user || null,           // Logged-in user (or null)
            profileUser,                       // Profile owner
            blogs,
            stats: {
                blogCount,
                followerCount: profileUser.followers.length,
                followingCount: profileUser.following.length
            },
            isOwner,
            isFollowing,
            isMutualFollow,
            showFollowersList,
            showFollowingList,
            visibleFollowers,
            visibleFollowing
        });

    } catch (error) {
        console.error("🚨 Public Profile Error:", error.message);
        res.status(500).render("error", { 
            user: req.user || null,
            error: "Failed to load profile" 
        });
    }
});

module.exports = router;
