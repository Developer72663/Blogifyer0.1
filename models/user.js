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
    
    // New: User profile enhancements
    bio: { type: String, default: "", maxlength: 500 },
    website: { type: String, default: "" },
    
    role: { 
        type: String, 
        enum: ["USER", "ADMIN"], 
        default: "USER" 
    },
    
    // New: Theme preference
    theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light"
    },
    
    // New: Followers system
    followers: [{ type: Schema.Types.ObjectId, ref: "user" }],
    following: [{ type: Schema.Types.ObjectId, ref: "user" }],
    
    // New: Notifications preferences
    notificationSettings: {
        emailOnComment: { type: Boolean, default: true },
        emailOnNewFollower: { type: Boolean, default: true },
        emailDigest: { type: Boolean, default: true }
    },
    
}, { timestamps: true });

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });

// Virtual for follower count
UserSchema.virtual("followerCount").get(function() {
    return this.followers.length;
});

// Virtual for following count
UserSchema.virtual("followingCount").get(function() {
    return this.following.length;
});

// ====================== PASSWORD HASHING (MODERN ASYNC WAY) ======================
UserSchema.pre("save", async function () {
    // Skip for Google users or if password is not being set/changed
    if (this.googleId || !this.password || !this.isModified("password")) {
        return;
    }

    try {
        const salt = randomBytes(16).toString("hex");
        this.salt = salt;
        this.password = createHmac("sha256", salt)
            .update(this.password)
            .digest("hex");
    } catch (error) {
        console.error("❌ Password Hashing Error:", error);
        throw error;
    }
});

// ====================== STATIC METHODS ======================
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

UserSchema.static("findOrCreateGoogleUser", async function (profile) {
    try {
        const email = profile.emails[0].value.toLowerCase();
        const googleId = profile.id;

        console.log(`🔍 Google Login Attempt: ${email}`);

        let user = await this.findOne({ googleId });

        if (!user) {
            user = await this.findOne({ email });

            if (user) {
                console.log(`🔗 Linking Google to existing user: ${email}`);
                user.googleId = googleId;
                if (profile.photos?.[0]?.value) {
                    user.profileImageURL = profile.photos[0].value;
                }
                await user.save();
            } else {
                console.log(`🆕 Creating new Google user: ${email}`);
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
        console.error("❌ findOrCreateGoogleUser Error:", error.message);
        throw error;
    }
});

// ====================== INSTANCE METHODS ======================
UserSchema.methods.followUser = async function(userId) {
    if (!this.following.includes(userId)) {
        this.following.push(userId);
        await this.save();
    }
};

UserSchema.methods.unfollowUser = async function(userId) {
    this.following = this.following.filter(id => id.toString() !== userId.toString());
    await this.save();
};

UserSchema.methods.isFollowing = function(userId) {
    return this.following.some(id => id.toString() === userId.toString());
};

UserSchema.methods.addFollower = async function(userId) {
    if (!this.followers.includes(userId)) {
        this.followers.push(userId);
        await this.save();
    }
};

UserSchema.methods.removeFollower = async function(userId) {
    this.followers = this.followers.filter(id => id.toString() !== userId.toString());
    await this.save();
};

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
