const express = require("express");
const router = express.Router();
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");
const NotificationService = require("../services/notificationService");

router.use(restrictToLoggedInUserOnly);

// ====================== GET NOTIFICATIONS PAGE (EJS) ======================
router.get("/page", async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = await NotificationService.getUserNotifications(
      req.user._id,
      15,
      page
    );

    res.render("notification", {
      user: req.user,
      notifications: result.notifications,
      total: result.total,
      pages: result.pages,
      currentPage: parseInt(page),
      title: "Notifications"
    });
  } catch (error) {
    console.error("Error rendering notifications page:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ====================== GET USER NOTIFICATIONS (JSON API) ======================
router.get("/", async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = await NotificationService.getUserNotifications(
      req.user._id,
      10,
      page
    );

    res.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
      pages: result.pages,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

// ====================== GET UNREAD COUNT ======================
router.get("/unread/count", async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
});

// ====================== MARK AS READ ======================
router.put("/:notificationId/read", async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.notificationId);
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
});

// ====================== MARK ALL AS READ ======================
router.put("/all/read", async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    res.json({ success: true, message: "All marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
});

// ====================== DELETE NOTIFICATION (Swipe to Delete) ======================
router.delete("/:notificationId", async (req, res) => {
  try {
    const success = await NotificationService.deleteNotification(
      req.params.notificationId,
      req.user._id
    );
    
    if (!success) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
});

module.exports = router;
