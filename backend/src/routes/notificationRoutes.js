const express = require("express");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const listNotifications = asyncHandler(async (req, res) => {
  const { userId, read } = req.query;
  const filter = {};

  if (req.user.role === "admin" && userId) {
    filter.user = userId;
  } else {
    filter.user = req.user._id;
  }

  if (typeof read !== "undefined") {
    filter.read = read === "true";
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Notification.find(filter)
      .select("user type title message read readAt createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  success(res, { items, page, limit, total });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, data: null, message: "Not found" });
  }
  if (req.user.role !== "admin" && String(notification.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, data: null, message: "Forbidden" });
  }
  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }
  success(res, notification.toObject());
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, data: null, message: "Not found" });
  }

  if (req.user.role !== "admin" && String(notification.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, data: null, message: "Forbidden" });
  }

  await Notification.deleteOne({ _id: notification._id });
  success(res, { id: notification._id }, "Notification deleted");
});

const router = express.Router();

router.use(authenticate);
router.get("/", authorize("admin", "teamLeader", "teamMember"), listNotifications);
router.patch("/:id/read", authorize("admin", "teamLeader", "teamMember"), markRead);
router.delete("/:id", authorize("admin", "teamLeader", "teamMember"), deleteNotification);

module.exports = router;
