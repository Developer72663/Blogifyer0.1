const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const UserRoute = require("./routes/User");
const BlogRoute = require("./routes/Blog");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// ====================== MongoDB Connection ======================
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in Environment Variables!");
    console.error("Please add it in Render Dashboard → Environment");
} else {
    mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 45000,
    })
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));
}

// ====================== Middleware ======================
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

app.use(checkForAuthenticationCookie("token"));

// ====================== Routes ======================
app.get("/health", (req, res) => res.status(200).send("OK"));

// Home Route
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        
        const allBlogs = await Blog.find({})
            .sort({ createdAt: -1 })
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        res.render("home", { 
            user: req.user || null,
            blogs: allBlogs || [] 
        });
    } catch (error) {
        console.error("🚨 Home Route Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

app.use("/user", UserRoute);
app.use("/blogs", BlogRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
