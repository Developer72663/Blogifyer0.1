const Notification = require("../models/Notification");
const User = require("../models/user");
const Blog = require("../models/Blog");
const { sendNotificationEmail } = require("./email");

const NotificationService = {
  /**
   * Create a single notification
   */
  async createNotification(recipientId, type, data = {}) {
    try {
      const notification = await Notification.create({
        recipient: recipientId,
        type,
        title: data.title || "",
        message: data.message || "",
        blog: data.blog || null,
        actor: data.actor || null
      });
      return notification;
    } catch (error) {
      console.error("❌ Create Notification Error:", error.message);
      throw error;
    }
  },

  /**
   * Notify all followers when a user publishes a new blog
   */
  async notifyFollowersOfNewBlog(authorId, blogId) {
    try {
      const [author, blog] = await Promise.all([
        User.findById(authorId).lean(),
        Blog.findById(blogId).lean()
      ]);

      if (!author || !blog) return;

      // Get all followers
      const authorWithFollowers = await User.findById(authorId)
        .populate("followers", "_id notificationSettings")
        .lean();

      if (!authorWithFollowers?.followers?.length) return;

      const notifications = authorWithFollowers.followers.map(follower => ({
        recipient: follower._id,
        type: "blogPost",
        title: "New blog from someone you follow",
        message: `${author.fullName} published a new blog: "${blog.title}"`,
        blog: blogId,
        actor: authorId
      }));

      // Bulk insert notifications
      await Notification.insertMany(notifications);

      // Send emails to followers who have email digest enabled
      for (const follower of authorWithFollowers.followers) {
        if (follower.notificationSettings?.emailDigest) {
          try {
            await sendNotificationEmail(follower, "blogPost", {
              actorName: author.fullName,
              blogTitle: blog.title,
              blogId: blog._id
            });
          } catch (emailErr) {
            console.error("Email notification failed:", emailErr.message);
          }
        }
      }

      console.log(`✅ Notified ${notifications.length} followers about new blog`);
    } catch (error) {
      console.error("❌ Notify Followers Error:", error.message);
    }
  },

  /**
   * Get paginated notifications for a user with populated data
   */
  async getUserNotifications(userId, limit = 15, page = 1) {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [notifications, total] = await Promise.all([
        Notification.find({ recipient: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate("actor", "fullName profileImageURL")
          .populate("blog", "title coverImageURL slug")
          .lean(),
        Notification.countDocuments({ recipient: userId })
      ]);

      return {
        notifications,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      };
    } catch (error) {
      console.error("❌ Get Notifications Error:", error.message);
      throw error;
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });
    } catch (error) {
      console.error("❌ Unread Count Error:", error.message);
      return 0;
    }
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId) {
    try {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    } catch (error) {
      console.error("❌ Mark Read Error:", error.message);
      throw error;
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );
    } catch (error) {
      console.error("❌ Mark All Read Error:", error.message);
      throw error;
    }
  },

  /**
   * Delete a notification (for swipe-to-delete)
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });
      return !!result;
    } catch (error) {
      console.error("❌ Delete Notification Error:", error.message);
      throw error;
    }
  },

  /**
   * Send email notification (wrapper)
   */
  async sendEmailNotification(user, type, data) {
    try {
      await sendNotificationEmail(user, type, data);
    } catch (error) {
      console.error("❌ Email Notification Error:", error.message);
    }
  }
};

module.exports = NotificationService;
