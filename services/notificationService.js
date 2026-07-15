const Notification = require("../models/Notification");
const User = require("../models/user");

class NotificationService {
  // ====================== CREATE SINGLE NOTIFICATION ======================
  async createNotification(recipient, type, data) {
    try {
      const notification = await Notification.create({
        recipient,
        type,
        title: data.title,
        message: data.message,
        blog: data.blog || null,
        actor: data.actor || null
      });
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // ====================== CREATE BLOG POST NOTIFICATIONS (FOLLOWERS) ======================
  async createBlogPostNotifications(authorId, blogId, blogTitle) {
    try {
      const author = await User.findById(authorId);
      if (!author || !author.followers || author.followers.length === 0) return;

      const docs = author.followers.map(followerId => ({
        recipient: followerId,
        type: "blog_post",
        title: "New blog post",
        message: `${author.fullName} published a new blog: "${blogTitle}"`,
        blog: blogId,
        actor: authorId
      }));

      await Notification.insertMany(docs);
    } catch (error) {
      console.error("Error creating blog post notifications:", error);
    }
  }

  // ====================== GET USER NOTIFICATIONS (POPULATED) ======================
  async getUserNotifications(userId, limit = 10, page = 1) {
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
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  // ====================== GET UNREAD COUNT ======================
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ recipient: userId, isRead: false });
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  // ====================== MARK AS READ ======================
  async markAsRead(notificationId) {
    try {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // ====================== MARK ALL AS READ ======================
  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
      throw error;
    }
  }

  // ====================== DELETE NOTIFICATION ======================
  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });
      return result;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // ====================== EMAIL NOTIFICATION ======================
  async sendEmailNotification(user, type, data) {
    try {
      // Placeholder: integrate with your existing email service
      const { sendOTPEmail } = require("./email");
      console.log(`📧 Email [${type}] sent to ${user.email}`);
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }
}

module.exports = new NotificationService();
