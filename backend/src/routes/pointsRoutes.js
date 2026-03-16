express = require("express");
const { body } = require("express-validator");
const { User } = require("../models/User");
const { Team } = require("../models/Team");
const { PointTransaction } = require("../models/PointTransaction");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const transferValidator = [
  body("toUserId").isMongoId(),
  body("points").isInt({ min: 1 }),
  body("reason").isString().trim().isLength({ min: 2 }),
];

const awardValidator = [
  body("toUserId").isMongoId(),
  body("points").isInt({ min: 1 }),
  body("reason").isString().trim().isLength({ min: 2 }),
];

const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.user.role !== "admin") {
    filter.$or = [{ fromUser: req.user._id }, { toUser: req.user._id }];
  }

  const [items, total] = await Promise.all([
    PointTransaction.find(filter)
      .populate("fromUser", "name email")
      .populate("toUser", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PointTransaction.countDocuments(filter),
  ]);

  success(res, { items, page, limit, total });
});

const createNotification = async ({ userId, title, message }) => {
  return Notification.create({
    user: userId,
    type: "points",
    title,
    message,
  });
};

const transferPoints = asyncHandler(async (req, res) => {
  const { toUserId, points, reason } = req.body;
  const leaderId = req.user._id;

  const [leader, member] = await Promise.all([
    User.findById(leaderId),
    User.findById(toUserId),
  ]);

  if (!leader || !member) {
    return res.status(404).json({ success: false, data: null, message: "User not found" });
  }

  if (String(leader._id) === String(member._id)) {
    return res.status(400).json({ success: false, data: null, message: "Cannot transfer to yourself" });
  }

  const leadsTeam = await Team.exists({ leader: leaderId, members: member._id });
  if (!leadsTeam || member.role !== "teamMember") {
    return res.status(403).json({ success: false, data: null, message: "Not authorized" });
  }

  if ((leader.points || 0) < points) {
    return res.status(400).json({ success: false, data: null, message: "Insufficient points" });
  }

  leader.points = Math.max(0, (leader.points || 0) - points);
  member.points = (member.points || 0) + points;
  await Promise.all([leader.save(), member.save()]);

  const transaction = await PointTransaction.create({
    fromUser: leaderId,
    toUser: member._id,
    points,
    reason,
    type: "transfer",
  });

  await createNotification({
    userId: member._id,
    title: "Points Awarded",
    message: `You have been awarded ${points} points by ${leader.name}. Reason: ${reason}`,
  });

  success(res, { transaction });
});

const awardPoints = asyncHandler(async (req, res) => {
  const { toUserId, points, reason } = req.body;

  const member = await User.findById(toUserId);
  if (!member) {
    return res.status(404).json({ success: false, data: null, message: "User not found" });
  }

  member.points = (member.points || 0) + points;
  await member.save();

  const transaction = await PointTransaction.create({
    fromUser: req.user._id,
    toUser: member._id,
    points,
    reason,
    type: "award",
  });

  await createNotification({
    userId: member._id,
    title: "Points Awarded",
    message: `You have been awarded ${points} points by ${req.user.name}. Reason: ${reason}`,
  });

  success(res, { transaction });
});

const router = express.Router();

router.use(authenticate);
router.get("/transactions", authorize("admin", "teamLeader", "teamMember"), listTransactions);
router.post("/transfer", authorize("teamLeader"), transferValidator, validate, transferPoints);
router.post("/award", authorize("admin"), awardValidator, validate, awardPoints);

module.exports = router;
