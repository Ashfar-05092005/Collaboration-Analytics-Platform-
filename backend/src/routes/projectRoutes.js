const express = require("express");
const { body } = require("express-validator");
const { Project } = require("../models/Project");
const { User } = require("../models/User");
const { Notification } = require("../models/Notification");
const { ActivityLog } = require("../models/ActivityLog");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const projectCreateValidator = [
	body("name").isString().isLength({ min: 2 }),
	body("startDate").isISO8601(),
	body("endDate").isISO8601(),
];

const parsePagination = (query) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
	return { page, limit, skip: (page - 1) * limit };
};

const projectAccessFilter = (req, projectId) => {
	if (req.user.role === "teamLeader") {
		return { _id: projectId, teamLeader: req.user._id };
	}
	return { _id: projectId };
};

const createProject = asyncHandler(async (req, res) => {
	const project = await Project.create({ ...req.body, createdBy: req.user._id });
	await ActivityLog.create({
		type: "project_created",
		entityType: "project",
		entityId: project._id,
		actor: req.user._id,
	});
	success(res, project, "Project created");
});

const listProjects = asyncHandler(async (req, res) => {
	const filter = req.user.role === "teamLeader" ? { teamLeader: req.user._id } : {};
	const { page, limit, skip } = parsePagination(req.query);
	const [projects, total] = await Promise.all([
		Project.find(filter)
			.select("projectId name description status progress teamLeader teamMembers startDate endDate createdAt")
			.populate("teamLeader", "name email")
			.populate("teamMembers", "name email status")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean(),
		Project.countDocuments(filter),
	]);
	success(res, { items: projects, page, limit, total });
});

const getProject = asyncHandler(async (req, res) => {
	const project = await Project.findOne(projectAccessFilter(req, req.params.id)).lean();
	if (!project) return res.status(404).json({ success: false, data: null, message: "Not found" });
	success(res, project);
});

const updateProject = asyncHandler(async (req, res) => {
	const existingProject = await Project.findOne(projectAccessFilter(req, req.params.id)).select("name teamMembers").lean();
	if (!existingProject) return res.status(404).json({ success: false, data: null, message: "Not found" });

	const project = await Project.findOneAndUpdate(projectAccessFilter(req, req.params.id), req.body, { new: true }).lean();
	if (!project) return res.status(404).json({ success: false, data: null, message: "Not found" });

	if (Array.isArray(req.body?.teamMembers)) {
		const beforeMembers = new Set((existingProject.teamMembers || []).map((member) => String(member)));
		const afterMembers = new Set((req.body.teamMembers || []).map((member) => String(member)));
		const removedMemberIds = Array.from(beforeMembers).filter((memberId) => !afterMembers.has(memberId));

		if (removedMemberIds.length > 0) {
			const removalReason = (req.body?.removalReason || "").trim();
			const suffix = removalReason ? ` Reason: ${removalReason}` : "";
			await Notification.insertMany(
				removedMemberIds.map((memberId) => ({
					user: memberId,
					type: "project_member_removed",
					title: "Removed from project",
					message: `You were removed from project \"${existingProject.name}\" by ${req.user.name}.${suffix}`,
				}))
			);
		}
	}

	await ActivityLog.create({
		type: "project_updated",
		entityType: "project",
		entityId: project._id,
		actor: req.user._id,
	});
	success(res, project, "Project updated");
});

const deleteProject = asyncHandler(async (req, res) => {
	const project = await Project.findOneAndDelete(projectAccessFilter(req, req.params.id)).lean();
	if (!project) return res.status(404).json({ success: false, data: null, message: "Not found" });

	const admins = await User.find({ role: "admin" }).select("_id").lean();
	if (admins.length > 0) {
		const notifications = admins.map((admin) => ({
			user: admin._id,
			type: "project_deleted",
			title: "Project deleted",
			message: `${project.name} was deleted by ${req.user.name}`,
		}));
		await Notification.insertMany(notifications);
	}

	await ActivityLog.create({
		type: "project_deleted",
		entityType: "project",
		entityId: project._id,
		actor: req.user._id,
	});

	success(res, { id: project._id }, "Project deleted");
});

const router = express.Router();

router.use(authenticate);
router.post("/", authorize("admin", "teamLeader"), projectCreateValidator, validate, createProject);
router.get("/", authorize("admin", "teamLeader"), listProjects);
router.get("/:id", authorize("admin", "teamLeader"), getProject);
router.patch("/:id", authorize("admin", "teamLeader"), updateProject);
router.delete("/:id", authorize("admin", "teamLeader"), deleteProject);

module.exports = router;

