const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const UserRoute = require("./routes/User");
const UserBlogsRoute = require("./routes/Blog");
const Blog = require("./models/blog");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

dotenv.config();

const PORT = process.env.PORT || 8000;
const app = express();

// ====================== MongoDB Connection ======================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1); // Exit if DB connection fails
    });

// ====================== View Engine ======================
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// ====================== Middlewares ======================
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.resolve("./public"))); // No need for "/" prefix

// Authentication middleware (runs on every request)
app.use(checkForAuthenticationCookie("token"));

// ====================== Routes ======================
app.get("/", async (req, res) => {
    try {
        const allBlogs = await Blog.find({})
            .sort({ createdAt: -1 })
            .populate("createdBy", "fullName email"); // Recommended: populate author info

        res.render("home", {
            user: req.user,
            blogs: allBlogs
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use("/user", UserRoute);
app.use("/blogs", UserBlogsRoute);

// ====================== Server ======================
app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
});

module.exports = app;
