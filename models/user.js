const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    salt: { type: String },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    profileImageURL: { type: String, default: "/imgs/default.png" },
    role: { 
        type: String, 
        enum: ["USER", "ADMIN"], 
        default: "USER" 
    },
}, { timestamps: true });

// ✅ FIXED: Pre-save middleware (No async with next())
UserSchema.pre("save", function (next) {
    // Skip if Google user or password not modified
    if (this.googleId || !this.password || !this.isModified("password")) {
        return next();
    }

    try {
        const salt = randomBytes(16).toString("hex");
        this.salt = salt;
        this.password = createHmac("sha256", salt)
            .update(this.password)
            .digest("hex");
        next();
    } catch (error) {
        console.error("Password Hashing Error:", error);
        next(error);
    }
});

// Match Password Method
UserSchema.static("matchPassword", async function (email, password) {
    const user = await this.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("User not found");
    if (!user.password) throw new Error("This account uses Google Sign-In");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

// Google User Handler
UserSchema.static("findOrCreateGoogleUser", async function (profile) {
    try {
        const email = profile.emails[0].value.toLowerCase();
        const googleId = profile.id;

        let user = await this.findOne({ googleId });

        if (!user) {
            user = await this.findOne({ email });

            if (user) {
                user.googleId = googleId;
                if (profile.photos?.[0]?.value) {
                    user.profileImageURL = profile.photos[0].value;
                }
                await user.save();
            } else {
                user = await this.create({
                    fullName: profile.displayName || "Google User",
                    email: email,
                    googleId: googleId,
                    profileImageURL: profile.photos?.[0]?.value || "/imgs/default.png"
                });
            }
        }

        return user;
    } catch (error) {
        console.error("findOrCreateGoogleUser Error:", error.message);
        throw error;
    }
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
