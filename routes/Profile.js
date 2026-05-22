const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");

const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

router.use(restrictToLoggedInUserOnly);

router.get("/", async (req, res) => {
    try {
        const userBlogs = await Blog.find({ createdBy: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.render("profile", {
            user: req.user,
            blogs: userBlogs
        });
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
