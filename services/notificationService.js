const Notification = require("../models/Notification");
const User = require("../models/user");
const { 
    sendEmail, 
    sendCommentNotificationEmail, 
    sendFollowNotificationEmail 
} = require("./email");

class NotificationService {
    
    // ====================== CREATE NOTIFICATION ======================
    static async createNotification(recipientId, type, data) {
        try {
            const notification = await Notification.create({
                recipient: recipientId,
                type,
                title: data.title,
                message: data.message,
                blog: data.blog || null,
                actor: data.actor || null,
                actionUrl: data.actionUrl || null
            });

            return notification;
        } catch (error) {
            console.error("❌ Error creating notification:", error.message);
            throw error;
        }
    }

    // ====================== CREATE BLOG POST NOTIFICATIONS (FOLLOWERS) ======================
    static async createBlogPostNotifications(authorId, blogId, blogTitle) {
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
            console.error("❌ Error creating blog post notifications:", error.message);
        }
    }

    // ====================== SEND EMAIL NOTIFICATION ======================
    static async sendEmailNotification(user, type, data) {
        try {
            if (!user || !user.email) {
                console.warn("⚠️ User or email missing in sendEmailNotification");
                return;
            }

            // Check user's notification settings
            if (user.notificationSettings) {
                let canSend = false;
                
                switch(type) {
                    case 'comment':
                        canSend = user.notificationSettings.emailOnComment !== false;
                        break;
                    case 'follow':
                        canSend = user.notificationSettings.emailOnNewFollower !== false;
                        break;
                    case 'digest':
                        canSend = user.notificationSettings.emailDigest !== false;
                        break;
                    default:
                        canSend = true;
                }

                if (!canSend) {
                    console.log(`⚠️ Email notification disabled for ${type} for user ${user._id}`);
                    return;
                }
            }

            switch(type) {
                case 'comment':
                    if (!data.blogTitle || !data.actorName || !data.comment) {
                        console.warn("⚠️ Missing required fields for comment email");
                        return;
                    }
                    await sendCommentNotificationEmail(user.email, {
                        blogTitle: data.blogTitle,
                        actorName: data.actorName,
                        comment: data.comment.substring(0, 100),
                        blogLink: data.blogLink || process.env.APP_URL || 'http://localhost:8000'
                    });
                    break;

                case 'follow':
                    if (!data.actorName) {
                        console.warn("⚠️ Missing required fields for follow email");
                        return;
                    }
                    await sendFollowNotificationEmail(user.email, {
                        followerName: data.actorName,
                        followerImage: data.followerImage || '/imgs/default.png',
                        profileLink: data.profileLink || process.env.APP_URL || 'http://localhost:8000'
                    });
                    break;

                case 'like':
                    if (!data.blogTitle || !data.actorName) {
                        console.warn("⚠️ Missing required fields for like email");
                        return;
                    }
                    await sendEmail(
                        user.email,
                        `Someone liked your blog "${data.blogTitle}"`,
                        `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                                <div style="background-color: white; border-radius: 10px; padding: 30px; text-align: center;">
                                    <h2 style="color: #667eea; margin: 0 0 10px 0;">Blog Liked!</h2>
                                    <p style="color: #666; margin: 15px 0;">
                                        <strong>${data.actorName}</strong> liked your blog <strong>"${data.blogTitle}"</strong> 👍
                                    </p>
                                    <a href="${data.blogLink || process.env.APP_URL || 'http://localhost:8000'}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                        View Blog
                                    </a>
                                </div>
                            </div>
                        `
                    );
                    break;

                default:
                    console.warn(`Unknown notification type: ${type}`);
            }

            console.log(`✅ ${type} email notification sent to ${user.email}`);

        } catch (error) {
            console.error(`❌ Error sending ${type} email notification:`, error.message);
            // Don't throw - notifications should continue even if email fails
        }
    }

    // ====================== GET USER NOTIFICATIONS (POPULATED) ======================
    static async getUserNotifications(userId, limit = 10, page = 1) {
        try {
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const [notifications, total] = await Promise.all([
                Notification.find({ recipient: userId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate("actor", "fullName profileImageURL email")
                    .populate("blog", "title slug coverImageURL createdAt")
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
            console.error("❌ Error getting notifications:", error.message);
            return { 
                notifications: [], 
                total: 0, 
                pages: 0,
                currentPage: parseInt(page)
            };
        }
    }

    // ====================== MARK AS READ ======================
    static async markAsRead(notificationId) {
        try {
            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { isRead: true },
                { new: true }
            );
            return notification;
        } catch (error) {
            console.error("❌ Error marking notification as read:", error.message);
            throw error;
        }
    }

    // ====================== MARK ALL AS READ ======================
    static async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );
            return result;
        } catch (error) {
            console.error("❌ Error marking all notifications as read:", error.message);
            throw error;
        }
    }

    // ====================== GET UNREAD COUNT ======================
    static async getUnreadCount(userId) {
        try {
            const count = await Notification.countDocuments({ 
                recipient: userId, 
                isRead: false 
            });
            return count;
        } catch (error) {
            console.error("❌ Error getting unread count:", error.message);
            return 0;
        }
    }

    // ====================== DELETE NOTIFICATION (WITH USER CHECK) ======================
    static async deleteNotification(notificationId, userId) {
        try {
            const result = await Notification.findOneAndDelete({
                _id: notificationId,
                recipient: userId
            });
            return result;
        } catch (error) {
            console.error("❌ Error deleting notification:", error.message);
            throw error;
        }
    }

    // ====================== DELETE ALL NOTIFICATIONS ======================
    static async deleteAllNotifications(userId) {
        try {
            const result = await Notification.deleteMany({ recipient: userId });
            return result;
        } catch (error) {
            console.error("❌ Error deleting all notifications:", error.message);
            throw error;
        }
    }

    // ====================== GET UNREAD NOTIFICATIONS ======================
    static async getUnreadNotifications(userId, limit = 5) {
        try {
            const notifications = await Notification.find({ 
                recipient: userId, 
                isRead: false 
            })
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .populate("actor", "fullName profileImageURL")
                .populate("blog", "title slug coverImageURL")
                .lean();

            return notifications;
        } catch (error) {
            console.error("❌ Error getting unread notifications:", error.message);
            return [];
        }
    }
}

module.exports = NotificationService;
