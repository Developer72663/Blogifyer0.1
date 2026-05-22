const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const UserRoute = require("./routes/User");
const BlogRoute = require("./routes/Blog");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// Environment Variables
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch(err => console.error("❌ MongoDB Error:", err.message));
}

// Middleware
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

app.use(passport.initialize());
app.use(checkForAuthenticationCookie("token"));

// Home Route
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const allBlogs = await Blog.find({})
            .sort({ createdAt: -1 })
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        console.log("👤 Home Page - User:", req.user ? req.user.email : "Guest");

        res.render("home", { 
            user: req.user || null,
            blogs: allBlogs || [] 
        });
    } catch (error) {
        console.error("🚨 Home Route Error:", error);
        res.status(500).send("Internal Server Error");
    }
});
const AdminRoute = require("./routes/Admin");

// Admin Routes
app.use("/admin", AdminRoute);

app.use("/user", UserRoute);
app.use("/blogs", BlogRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
