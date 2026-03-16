const express = require("express");
const { ActivityLog } = require("../models/ActivityLog");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");

const parsePagination = (query) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
	return { page, limit, skip: (page - 1) * limit };
};

const listActivity = asyncHandler(async (req, res) => {
	const { page, limit, skip } = parsePagination(req.query);
	const [logs, total] = await Promise.all([
		ActivityLog.find()
			.select("type entityType entityId actor targetUser metadata createdAt")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean(),
		ActivityLog.countDocuments({}),
	]);
	success(res, { items: logs, page, limit, total });
});

const router = express.Router();

router.use(authenticate);
router.get("/", authorize("admin", "teamLeader"), listActivity);

module.exports = router;

