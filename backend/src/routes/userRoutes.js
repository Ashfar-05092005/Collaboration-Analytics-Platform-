const express = require("express");
const mongoose = require("mongoose");
const { User } = require("../models/User");
const { Task } = require("../models/Task");
const { Team } = require("../models/Team");
const { ActivityLog } = require("../models/ActivityLog");
const { RefreshToken } = require("../models/RefreshToken");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");

const SUPER_ADMIN_EMAIL = "mohammedashfarm.ag23@bitsathy.ac.in";

const parsePagination = (query) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
	return { page, limit, skip: (page - 1) * limit };
};

const isSuperAdmin = (req) => {
	const email = String(req.user?.email || "").trim().toLowerCase();
	return email === SUPER_ADMIN_EMAIL;
};

const USER_CODE_PREFIX = {
	admin: "AD",
	teamLeader: "TL",
	teamMember: "TM",
};

const getNextUserCode = async (role) => {
	const prefix = USER_CODE_PREFIX[role];
	if (!prefix) throw new Error("Invalid role for user code");

	const latest = await User.findOne({ role, userCode: new RegExp(`^${prefix}\\d{3}$`) })
		.sort({ userCode: -1 })
		.select("userCode")
		.lean();

	const lastNumber = latest?.userCode ? Number(latest.userCode.slice(prefix.length)) : 0;
	const baseNumber = 100;
	let nextNumber = Math.max(lastNumber, baseNumber) + 1;
	if (nextNumber > 999) {
		throw new Error("User code limit reached for role");
	}

	let candidate = `${prefix}${String(nextNumber).padStart(3, "0")}`;
	while (await User.exists({ userCode: candidate })) {
		nextNumber += 1;
		if (nextNumber > 999) {
			throw new Error("User code limit reached for role");
		}
		candidate = `${prefix}${String(nextNumber).padStart(3, "0")}`;
	}

	return candidate;
};

const listUsers = asyncHandler(async (req, res) => {
	const { role, status } = req.query;
	const filter = {};

	if (req.user.role === "teamLeader") {
		const requestedRole = role || "teamMember";
		if (requestedRole !== "teamMember") {
			return res.status(403).json({ success: false, data: null, message: "Not authorized" });
		}
		filter.role = "teamMember";
	} else if (role) {
		filter.role = role;
	}

	if (status) filter.status = status;

	const { page, limit, skip } = parsePagination(req.query);
	const [users, total] = await Promise.all([
		User.find(filter)
			.select("name email role status userCode points teamId createdAt")
			.skip(skip)
			.limit(limit)
			.lean(),
		User.countDocuments(filter),
	]);

	success(res, { items: users, page, limit, total });
});

const getUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.params.id).select("-passwordHash").lean();
	if (!user) return res.status(404).json({ success: false, data: null, message: "Not found" });
	success(res, user);
});

const updateUser = asyncHandler(async (req, res) => {
	const updates = { ...req.body };
	delete updates.passwordHash;
	delete updates.userCode;

	const target = await User.findById(req.params.id).select("-passwordHash");
	if (!target) return res.status(404).json({ success: false, data: null, message: "Not found" });

	if (target.role === "admin" && !isSuperAdmin(req)) {
		return res.status(403).json({ success: false, data: null, message: "Only super admin can edit admin users" });
	}

	if (updates.role && updates.role !== target.role) {
		target.role = updates.role;
		target.userCode = await getNextUserCode(updates.role);
	}

	Object.assign(target, updates);
	await target.save();

	success(res, target);
});

const updateStatus = asyncHandler(async (req, res) => {
	const { status } = req.body;
	const target = await User.findById(req.params.id).select("-passwordHash");
	if (!target) return res.status(404).json({ success: false, data: null, message: "Not found" });

	if (target.role === "admin" && !isSuperAdmin(req)) {
		return res.status(403).json({ success: false, data: null, message: "Cannot change admin status" });
	}

	const allowed = ["active", "inactive"];
	if (!allowed.includes(status)) {
		return res.status(400).json({ success: false, data: null, message: "Invalid status" });
	}

	target.status = status;
	await target.save();
	success(res, target, "Status updated");
});

const updateRole = asyncHandler(async (req, res) => {
	const { role } = req.body;
	if (!role || !["teamMember", "teamLeader"].includes(role)) {
		return res.status(400).json({ success: false, data: null, message: "Role must be teamMember or teamLeader" });
	}

	const target = await User.findById(req.params.id).select("-passwordHash");
	if (!target) return res.status(404).json({ success: false, data: null, message: "Not found" });

	if (target.role === "admin" && !isSuperAdmin(req)) {
		return res.status(403).json({ success: false, data: null, message: "Cannot change admin role" });
	}

	if (target.role !== role) {
		target.role = role;
		target.userCode = await getNextUserCode(role);
	}
	await target.save();
	success(res, target, "Role updated");
});

const updatePoints = asyncHandler(async (req, res) => {
	const { delta, points, op } = req.body;

	const target = await User.findById(req.params.id).select("-passwordHash");
	if (!target) return res.status(404).json({ success: false, data: null, message: "Not found" });

	if (req.user.role === "teamLeader") {
		const isSelf = String(target._id) === String(req.user._id);
		if (!isSelf) {
			const leadsTeam = await Team.exists({ leader: req.user._id, members: target._id });
			if (!leadsTeam || target.role !== "teamMember") {
				return res.status(403).json({ success: false, data: null, message: "Not authorized" });
			}
		}
		if (typeof delta !== "number" || !Number.isFinite(delta)) {
			return res.status(400).json({ success: false, data: null, message: "Team leaders must use delta" });
		}
	}

	if (typeof delta === "number" && Number.isFinite(delta)) {
		const current = target.points || 0;
		const next = current + delta;
		target.points = next < 0 ? 0 : next;
		await target.save();
		return success(res, target, "Points adjusted");
	}

	if (typeof points === "number" && Number.isFinite(points)) {
		if (op === "add") {
			const current = target.points || 0;
			const next = current + points;
			target.points = next < 0 ? 0 : next;
			await target.save();
			return success(res, target, "Points adjusted");
		}
		if (op === "set") {
			if (points < 0) {
				return res.status(400).json({ success: false, data: null, message: "Points cannot be negative" });
			}
			target.points = points;
			await target.save();
			return success(res, target, "Points updated");
		}
	}

	return res.status(400).json({ success: false, data: null, message: "Invalid payload" });
});

const deleteUser = asyncHandler(async (req, res) => {
	const target = await User.findById(req.params.id).select("-passwordHash");
	if (!target) return res.status(404).json({ success: false, data: null, message: "Not found" });

	if (target.role === "admin" && !isSuperAdmin(req)) {
		return res.status(403).json({ success: false, data: null, message: "Cannot delete admin user" });
	}

	const taskCount = await Task.countDocuments({ assignedTo: target._id });
	if (taskCount > 0) {
		return res.status(409).json({ success: false, data: null, message: "User has assigned tasks; reassign before deletion" });
	}

	const leadsTeam = await Team.exists({ leader: target._id });
	if (leadsTeam) {
		return res.status(409).json({ success: false, data: null, message: "User leads a team; transfer leadership before deletion" });
	}

	await Team.updateMany({ members: target._id }, { $pull: { members: target._id } });
	await RefreshToken.deleteMany({ user: target._id });

	await User.findByIdAndDelete(target._id);
	success(res, null, "User deleted");
});

const TASK_STATUS_GROUPS = {
	pending: ["assigned", "changes_requested"],
	in_progress: ["submitted", "on_review"],
	completed: ["completed"],
};

const toIsoDate = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date;
};

const resolveDisplayStatus = (status) => {
	if (TASK_STATUS_GROUPS.completed.includes(status)) return "Completed";
	if (TASK_STATUS_GROUPS.in_progress.includes(status)) return "In Progress";
	return "Pending";
};

const canAccessUserHistory = async (reqUser, targetUserId) => {
	if (reqUser.role === "admin") return true;

	if (reqUser.role === "teamMember") {
		return String(reqUser._id) === String(targetUserId);
	}

	if (reqUser.role === "teamLeader") {
		if (String(reqUser._id) === String(targetUserId)) return true;
		return Boolean(
			await Team.exists({
				leader: reqUser._id,
				members: targetUserId,
			})
		);
	}

	return false;
};

const getUserHistory = asyncHandler(async (req, res) => {
	const targetUserId = req.params.id;
	if (!mongoose.isValidObjectId(targetUserId)) {
		return res.status(400).json({ success: false, data: null, message: "Invalid user id" });
	}

	const targetUser = await User.findById(targetUserId)
		.select("name role teamId email")
		.populate("teamId", "name")
		.lean();

	if (!targetUser) {
		return res.status(404).json({ success: false, data: null, message: "Not found" });
	}

	const hasAccess = await canAccessUserHistory(req.user, targetUserId);
	if (!hasAccess) {
		return res.status(403).json({ success: false, data: null, message: "Not authorized" });
	}

	const { status, fromDate, toDate } = req.query;
	const taskFilter = { assignedTo: targetUserId };

	if (status) {
		const requested = String(status).trim().toLowerCase();
		if (TASK_STATUS_GROUPS[requested]) {
			taskFilter.status = { $in: TASK_STATUS_GROUPS[requested] };
		} else {
			taskFilter.status = requested;
		}
	}

	const startDate = toIsoDate(fromDate);
	const endDate = toIsoDate(toDate);
	if (startDate || endDate) {
		taskFilter.createdAt = {};
		if (startDate) {
			taskFilter.createdAt.$gte = startDate;
		}
		if (endDate) {
			const inclusiveEnd = new Date(endDate);
			inclusiveEnd.setHours(23, 59, 59, 999);
			taskFilter.createdAt.$lte = inclusiveEnd;
		}
	}

	const tasks = await Task.find(taskFilter)
		.select("title projectId status createdAt reviewedAt reviewedBy reviewComment reviewRating")
		.populate("projectId", "name")
		.populate("reviewedBy", "name role")
		.sort({ createdAt: -1 })
		.lean();

	const taskIds = tasks.map((task) => task._id);
	const timelineLogs = taskIds.length
		? await ActivityLog.find({
				targetUser: targetUserId,
				entityType: "task",
				entityId: { $in: taskIds },
				type: { $in: ["task_created", "task_updated", "task_status_changed"] },
		  })
				.select("type entityId metadata createdAt")
				.sort({ createdAt: 1 })
				.lean()
		: [];

	const taskMap = new Map(tasks.map((task) => [String(task._id), task]));
	const workHistory = tasks.map((task) => ({
		taskId: task._id,
		taskName: task.title,
		projectName: task.projectId?.name || "-",
		status: resolveDisplayStatus(task.status),
		startDate: task.createdAt,
		completionDate: task.status === "completed" ? task.reviewedAt || null : null,
	}));

	const activityTimeline = timelineLogs
		.map((log) => {
			const task = taskMap.get(String(log.entityId));
			if (!task) return null;

			let action = "Task updated";
			if (log.type === "task_created") {
				action = "Task assigned";
			} else if (log.type === "task_status_changed" && log.metadata?.status === "completed") {
				action = "Task completed";
			}

			return {
				id: log._id,
				action,
				taskName: task.title,
				createdAt: log.createdAt,
			};
		})
		.filter(Boolean);

	const reviews = tasks
		.filter((task) => task.reviewedBy && task.reviewedAt)
		.map((task) => ({
			id: `${task._id}-review`,
			taskName: task.title,
			reviewerName: task.reviewedBy?.name || "-",
			date: task.reviewedAt,
			rating: typeof task.reviewRating === "number" ? task.reviewRating : task.status === "completed" ? 5 : 2,
			feedbackComment: task.reviewComment || (task.status === "completed" ? "Approved" : "Changes requested"),
		}))
		.sort((a, b) => new Date(b.date) - new Date(a.date));

	success(res, {
		user: {
			id: targetUser._id,
			name: targetUser.name,
			role: targetUser.role,
			team: targetUser.teamId?.name || "Unassigned",
			email: targetUser.email,
		},
		workHistory,
		activityTimeline,
		reviews,
	});
});

const router = express.Router();

router.use(authenticate);
router.get("/", authorize("admin", "teamLeader"), listUsers);
router.get("/:id/history", authorize("admin", "teamLeader", "teamMember"), getUserHistory);
router.get("/:id", authorize("admin"), getUser);
router.patch("/:id", authorize("admin"), updateUser);
router.patch("/:id/status", authorize("admin"), updateStatus);
router.patch("/:id/role", authorize("admin"), updateRole);
router.patch("/:id/points", authorize("admin", "teamLeader"), updatePoints);
router.delete("/:id", authorize("admin"), deleteUser);

module.exports = router;

