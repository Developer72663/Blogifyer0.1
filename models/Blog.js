const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const BlogSchema = new Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    coverImageURL: { type: String, default: null },
    
    // New: Blog states and publishing
    status: { 
        type: String, 
        enum: ["draft", "published"], 
        default: "published"
    },
    publishedAt: { type: Date, default: null },
    scheduledPublishAt: { type: Date, default: null },
    
    // New: SEO and metadata
    excerpt: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    slug: { type: String, unique: true, sparse: true },
    readingTime: { type: Number, default: 0 },
    
    // New: Tags and categories
    tags: [{ type: String }],
    category: { type: String, default: "General" },
    
    // New: Engagement metrics
    viewCount: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: "user" }],
    isFeatured: { type: Boolean, default: false },
    featuredRank: { type: Number, default: 0 },
    
    // References
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: "user",
        required: true 
    },
    
    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    
}, { timestamps: true });

// Index for better query performance
BlogSchema.index({ createdBy: 1, status: 1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ category: 1 });
BlogSchema.index({ slug: 1 });
BlogSchema.index({ isFeatured: 1, featuredRank: 1 });

// Virtual for like count
BlogSchema.virtual("likeCount").get(function() {
    return this.likes.length;
});

// Method to calculate reading time
BlogSchema.methods.calculateReadingTime = function() {
    const wordsPerMinute = 200;
    const words = this.body.trim().split(/\s+/).length;
    this.readingTime = Math.ceil(words / wordsPerMinute);
};

// Method to generate slug
BlogSchema.methods.generateSlug = function() {
    this.slug = this.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        + "-" + Date.now();
};

// Middleware: calculate reading time before save
BlogSchema.pre("save", function(next) {
    if (!this.slug) {
        this.generateSlug();
    }
    this.calculateReadingTime();
    if (this.status === "published" && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});

// Query middleware: exclude soft deleted blogs by default
BlogSchema.query.notDeleted = function() {
    return this.where({ isDeleted: false });
};

const Blog = mongoose.models.blog || model("blog", BlogSchema);
module.exports = Blog;
