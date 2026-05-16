const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

console.log("🚀 Server Starting...");

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
})
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Failed:", err.message);
    });

// View Engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middlewares
app.use(require("cookie-parser")());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.resolve("./public")));

// Authentication Middleware (with error handling)
try {
    const { checkForAuthenticationCookie } = require("./middlewares/authentication");
    app.use(checkForAuthenticationCookie("token"));
    console.log("✅ Authentication middleware loaded");
} catch (err) {
    console.error("❌ Authentication middleware failed to load:", err.message);
}

// Routes
try {
    app.use("/user", require("./routes/User"));
    app.use("/blogs", require("./routes/Blog"));
    console.log("✅ Routes loaded successfully");
} catch (err) {
    console.error("❌ Routes failed to load:", err.message);
}

// Home Route
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 }).lean();
        res.render("home", {
            user: req.user || null,
            blogs: allBlogs || []
        });
    } catch (error) {
        console.error("Home Route Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

console.log("✅ All modules loaded. Server ready.");

module.exports = app;
