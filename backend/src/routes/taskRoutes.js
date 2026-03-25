const express = require("express");
const { body } = require("express-validator");
const { Task } = require("../models/Task");
const { Project } = require("../models/Project");
const { Notification } = require("../models/Notification");
const { ActivityLog } = require("../models/ActivityLog");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const taskCreateValidator = [
	body("title").isString().isLength({ min: 2 }),
	body("projectId").isMongoId(),
	body("assignedTo").isMongoId(),
	body("dueDate").isISO8601(),
];

const parsePagination = (query) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
	return { page, limit, skip: (page - 1) * limit };
};

const populateTask = (query) =>
	query
		.populate("projectId", "name")
		.populate("assignedTo", "name email");

const formatTask = (task) => {
	if (!task) return task;
	const projectId = task.projectId && task.projectId._id ? task.projectId._id : task.projectId;
	const projectName = task.projectId && task.projectId.name ? task.projectId.name : task.projectName;
	const assignedTo = task.assignedTo && task.assignedTo._id ? task.assignedTo._id : task.assignedTo;
	const assignedToName = task.assignedTo && task.assignedTo.name ? task.assignedTo.name : task.assignedToName;
	const assignedToEmail = task.assignedTo && task.assignedTo.email ? task.assignedTo.email : task.assignedToEmail;
	const assignedBy = task.assignedBy && task.assignedBy._id ? task.assignedBy._id : task.assignedBy;
	const reviewedBy = task.reviewedBy && task.reviewedBy._id ? task.reviewedBy._id : task.reviewedBy;
  const reviewRating = typeof task.reviewRating === "number" ? task.reviewRating : null;

	return {
		...task,
		projectId,
		projectName,
		assignedTo,
		assignedToName,
		assignedToEmail,
		assignedBy,
		reviewedBy,
    reviewRating,
	};
};

const createNotification = async ({ userId, title, message }) =>
	Notification.create({
		user: userId,
		type: "task",
		title,
		message,
	});

const createTask = asyncHandler(async (req, res) => {
	const task = await Task.create({
		...req.body,
		createdBy: req.user._id,
		assignedBy: req.user._id,
	});
	await ActivityLog.create({
		type: "task_created",
		entityType: "task",
		entityId: task._id,
		actor: req.user._id,
		targetUser: task.assignedTo,
	});
	const populated = await populateTask(Task.findById(task._id)).lean();
	success(res, formatTask(populated), "Task created");
});

const listTasks = asyncHandler(async (req, res) => {
	const { status, priority, projectId, assignedTo, createdBy } = req.query;
	const filter = {};

	if (status) filter.status = status;
	if (priority) filter.priority = priority;
	if (projectId) filter.projectId = projectId;
	if (assignedTo) filter.assignedTo = assignedTo;
	if (createdBy) filter.createdBy = createdBy;

	if (req.user.role === "teamMember") {
		filter.assignedTo = req.user._id;
	} else if (req.user.role === "teamLeader") {
		const leaderProjects = await Project.find({ teamLeader: req.user._id }).select("_id").lean();
		const leaderProjectIds = leaderProjects.map((project) => String(project._id));

		if (leaderProjectIds.length === 0) {
			const { page, limit } = parsePagination(req.query);
			return success(res, { items: [], page, limit, total: 0 });
		}

		if (projectId) {
			if (!leaderProjectIds.includes(String(projectId))) {
				const { page, limit } = parsePagination(req.query);
				return success(res, { items: [], page, limit, total: 0 });
			}
			filter.projectId = projectId;
		} else {
			filter.projectId = { $in: leaderProjectIds };
		}
	}

	const { page, limit, skip } = parsePagination(req.query);
	const [tasks, total] = await Promise.all([
		populateTask(
			Task.find(filter)
				.select(
					"taskId title description projectId assignedTo assignedBy status priority dueDate createdAt createdBy reviewComment reviewRating reviewedBy reviewedAt"
				)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
		).lean(),
		Task.countDocuments(filter),
	]);
	success(res, { items: tasks.map(formatTask), page, limit, total });
});

const getTask = asyncHandler(async (req, res) => {
	const task = await populateTask(Task.findById(req.params.id)).lean();
	if (!task) return res.status(404).json({ success: false, data: null, message: "Not found" });
	success(res, formatTask(task));
});

const updateTask = asyncHandler(async (req, res) => {
	const updatePayload = { ...req.body };
	delete updatePayload.status;
	delete updatePayload.reviewComment;
	delete updatePayload.reviewRating;
	delete updatePayload.reviewedBy;
	delete updatePayload.reviewedAt;
	delete updatePayload.assignedBy;
	delete updatePayload.taskId;
	const task = await populateTask(
		Task.findByIdAndUpdate(req.params.id, updatePayload, { new: true })
	).lean();
	if (!task) return res.status(404).json({ success: false, data: null, message: "Not found" });
	const targetUser = task.assignedTo && task.assignedTo._id ? task.assignedTo._id : task.assignedTo;
	await ActivityLog.create({
		type: "task_updated",
		entityType: "task",
		entityId: task._id,
		actor: req.user._id,
		targetUser,
	});
	success(res, formatTask(task), "Task updated");
});

const updateTaskStatus = asyncHandler(async (req, res) => {
	const { status, reviewComment, reviewRating } = req.body;
	const allowedStatuses = [
		"assigned",
		"submitted",
		"on_review",
		"changes_requested",
		"completed",
	];

	if (!allowedStatuses.includes(status)) {
		return res.status(400).json({ success: false, data: null, message: "Invalid status" });
	}

	const task = await Task.findById(req.params.id);
	if (!task) return res.status(404).json({ success: false, data: null, message: "Not found" });
	if (!task.assignedBy && task.createdBy) {
		task.assignedBy = task.createdBy;
	}

	const assignedBy = task.assignedBy || task.createdBy;
	const isMember = req.user.role === "teamMember";
	const isLeader = req.user.role === "teamLeader";
	const isAdmin = req.user.role === "admin";
	const normalizedRating = Number(reviewRating);
	const hasRating = reviewRating !== undefined && reviewRating !== null && reviewRating !== "";

	if ((isLeader || isAdmin) && ["changes_requested", "completed"].includes(status)) {
		if (!hasRating || !Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
			return res.status(400).json({ success: false, data: null, message: "Review rating must be between 1 and 5" });
		}
	}

	if (isMember) {
		if (String(task.assignedTo) !== String(req.user._id)) {
			return res.status(403).json({ success: false, data: null, message: "Forbidden" });
		}
		if (status !== "on_review") {
			return res.status(400).json({ success: false, data: null, message: "Only submission allowed" });
		}
		const canSubmit = ["assigned", "changes_requested", "submitted"].includes(task.status);
		if (!canSubmit) {
			return res.status(400).json({ success: false, data: null, message: "Task not ready for review" });
		}
		task.status = "on_review";
		task.reviewComment = "";
		task.reviewRating = null;
		task.reviewedBy = null;
		task.reviewedAt = null;
		await task.save();

		if (assignedBy) {
			await createNotification({
				userId: assignedBy,
				title: "Task Submitted",
				message: `A task ("${task.title}") has been submitted for review.`,
			});
		}
	} else if (isLeader || isAdmin) {
		if (isLeader && String(assignedBy) !== String(req.user._id)) {
			return res.status(403).json({ success: false, data: null, message: "Forbidden" });
		}

		if (status === "changes_requested") {
			const comment = (reviewComment || "").trim();
			if (!comment) {
				return res.status(400).json({ success: false, data: null, message: "Review comment required" });
			}
			task.status = "changes_requested";
			task.reviewComment = comment;
			task.reviewRating = normalizedRating;
			task.reviewedBy = req.user._id;
			task.reviewedAt = new Date();
			await task.save();

			await createNotification({
				userId: task.assignedTo,
				title: "Changes Requested",
				message: `Changes requested for task ("${task.title}"): ${comment}`,
			});
		} else if (status === "completed") {
			task.status = "completed";
			task.reviewComment = (reviewComment || "").trim();
			task.reviewRating = normalizedRating;
			task.reviewedBy = req.user._id;
			task.reviewedAt = new Date();
			await task.save();

			await createNotification({
				userId: task.assignedTo,
				title: "Task Approved",
				message: `Your task ("${task.title}") has been approved and marked completed.`,
			});
		} else if (status === "on_review") {
			task.status = "on_review";
			task.reviewRating = null;
			await task.save();
		} else {
			return res.status(400).json({ success: false, data: null, message: "Invalid review action" });
		}
	} else {
		return res.status(403).json({ success: false, data: null, message: "Forbidden" });
	}

	const populated = await populateTask(Task.findById(task._id)).lean();
	const targetUser = populated.assignedTo && populated.assignedTo._id ? populated.assignedTo._id : populated.assignedTo;
	await ActivityLog.create({
		type: "task_status_changed",
		entityType: "task",
		entityId: task._id,
		actor: req.user._id,
		targetUser,
		metadata: {
			status: populated.status,
			reviewComment: populated.reviewComment || "",
			reviewRating: typeof populated.reviewRating === "number" ? populated.reviewRating : null,
		},
	});
	success(res, formatTask(populated), "Status updated");
});

const deleteTask = asyncHandler(async (req, res) => {
	const task = await Task.findByIdAndDelete(req.params.id).lean();
	if (!task) return res.status(404).json({ success: false, data: null, message: "Not found" });
	success(res, { id: task._id }, "Task deleted");
});

const router = express.Router();

router.use(authenticate);
router.post("/", authorize("admin", "teamLeader"), taskCreateValidator, validate, createTask);
router.get("/", authorize("admin", "teamLeader", "teamMember"), listTasks);
router.get("/:id", authorize("admin", "teamLeader", "teamMember"), getTask);
router.patch("/:id", authorize("admin", "teamLeader"), updateTask);
router.patch("/:id/status", authorize("admin", "teamLeader", "teamMember"), updateTaskStatus);
router.delete("/:id", authorize("admin"), deleteTask);

module.exports = router;

