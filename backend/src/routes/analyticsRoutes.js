const express = require("express");
const { Task } = require("../models/Task");
const { Project } = require("../models/Project");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");

const getTaskCompletionRate = async (filter) => {
	const [result] = await Task.aggregate([
		{ $match: filter },
		{
			$group: {
				_id: null,
				total: { $sum: 1 },
				completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
			},
		},
		{
			$project: {
				_id: 0,
				total: 1,
				completed: 1,
				rate: {
					$cond: [
						{ $eq: ["$total", 0] },
						0,
						{ $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
					],
				},
			},
		},
	]);

	return result || { total: 0, completed: 0, rate: 0 };
};

const getProjectProgress = async (filter) => {
	return Project.find(filter)
		.select("name progress status teamLeader startDate endDate")
		.lean();
};

const getUserContribution = async (filter) => {
	return Task.aggregate([
		{ $match: filter },
		{
			$group: {
				_id: "$assignedTo",
				tasksCompleted: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
				tasksInProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
				tasksTotal: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 0,
				userId: "$_id",
				tasksCompleted: 1,
				tasksInProgress: 1,
				tasksTotal: 1,
			},
		},
	]);
};

const summary = asyncHandler(async (req, res) => {
	const filter = req.user.role === "teamLeader" ? { createdBy: req.user._id } : {};
	const taskCompletion = await getTaskCompletionRate(filter);
	success(res, { taskCompletion });
});

const teamProductivity = asyncHandler(async (req, res) => {
	const filter = req.user.role === "teamLeader" ? { createdBy: req.user._id } : {};
	const data = await getUserContribution(filter);
	success(res, data);
});

const projectProgress = asyncHandler(async (req, res) => {
	const filter = req.user.role === "teamLeader" ? { teamLeader: req.user._id } : {};
	const data = await getProjectProgress(filter);
	success(res, data);
});

const router = express.Router();

router.use(authenticate);
router.get("/summary", authorize("admin", "teamLeader"), summary);
router.get("/team-productivity", authorize("admin", "teamLeader"), teamProductivity);
router.get("/project-progress", authorize("admin", "teamLeader"), projectProgress);

module.exports = router;

