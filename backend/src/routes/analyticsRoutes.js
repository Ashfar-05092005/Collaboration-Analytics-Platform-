const express = require("express");
const { Task } = require("../models/Task");
const { Project } = require("../models/Project");
const { Issue } = require("../models/Issue");
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

const getProjectStatusData = async (filter) => {
	const grouped = await Project.aggregate([
		{ $match: filter },
		{ $group: { _id: { $ifNull: ["$status", "unknown"] }, value: { $sum: 1 } } },
		{ $project: { _id: 0, name: "$_id", value: 1 } },
	]);

	return grouped;
};

const getUserContribution = async (filter) => {
	return Task.aggregate([
		{ $match: filter },
		{
			$group: {
				_id: "$assignedTo",
				tasksCompleted: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
				tasksInProgress: {
					$sum: {
						$cond: [
							{ $in: ["$status", ["assigned", "submitted", "on_review", "changes_requested"]] },
							1,
							0,
						],
					},
				},
				tasksTotal: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 0,
				userId: "$_id",
				userName: 1,
				tasksCompleted: 1,
				tasksInProgress: 1,
				tasksTotal: 1,
				contributionScore: {
					$cond: [
						{ $eq: ["$tasksTotal", 0] },
						0,
						{ $round: [{ $multiply: [{ $divide: ["$tasksCompleted", "$tasksTotal"] }, 100] }, 0] },
					],
				},
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "userId",
				foreignField: "_id",
				as: "user",
			},
		},
		{
			$set: {
				userName: {
					$ifNull: [{ $arrayElemAt: ["$user.name", 0] }, "Unknown"],
				},
			},
		},
		{ $unset: "user" },
		{ $sort: { tasksCompleted: -1, tasksTotal: -1 } },
	]);
};

const getTasksByPriority = async (filter) => {
	const grouped = await Task.aggregate([
		{ $match: filter },
		{ $group: { _id: { $ifNull: ["$priority", "unknown"] }, count: { $sum: 1 } } },
		{ $project: { _id: 0, priority: "$_id", count: 1 } },
	]);

	const priorityOrder = ["critical", "high", "medium", "low"];
	const groupedMap = new Map(grouped.map((entry) => [entry.priority, entry.count]));
	return priorityOrder.map((priority) => ({
		priority: priority.charAt(0).toUpperCase() + priority.slice(1),
		count: groupedMap.get(priority) || 0,
	}));
};

const getTaskCompletionTimeline = async (filter) => {
	const now = new Date();
	const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const grouped = await Task.aggregate([
		{
			$match: {
				...filter,
				createdAt: { $gte: prevMonthStart, $lt: nextMonthStart },
			},
		},
		{
			$group: {
				_id: {
					year: { $year: "$createdAt" },
					month: { $month: "$createdAt" },
				},
				total: { $sum: 1 },
				completed: {
					$sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
				},
			},
		},
	]);

	const monthKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;
	const groupedMap = new Map(grouped.map((entry) => [`${entry._id.year}-${entry._id.month}`, entry]));
	const months = [prevMonthStart, thisMonthStart];

	return months.map((monthDate) => {
		const label = monthDate.toLocaleString("en-US", { month: "short" });
		const entry = groupedMap.get(monthKey(monthDate));
		return {
			month: label,
			completed: entry?.completed || 0,
			total: entry?.total || 0,
		};
	});
};

const getAnalyticsIssueFilter = (user) => {
	if (user.role !== "teamLeader") return {};
	return {
		$or: [
			{ reportedBy: user._id },
			{ escalatedToTL: user._id },
		],
	};
};

const getIssueStats = async (filter) => {
	const grouped = await Issue.aggregate([
		{ $match: filter },
		{ $group: { _id: "$status", count: { $sum: 1 } } },
	]);

	const groupedMap = new Map(grouped.map((entry) => [entry._id, entry.count]));
	const total = Array.from(groupedMap.values()).reduce((sum, value) => sum + value, 0);
	const resolved = groupedMap.get("resolved") || 0;

	return {
		total,
		open: groupedMap.get("open") || 0,
		inReview: groupedMap.get("in-review") || 0,
		escalated: groupedMap.get("escalated") || 0,
		resolved,
		resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
	};
};

const getAnalyticsTaskFilter = async (user) => {
	if (user.role !== "teamLeader") return {};
	const projects = await Project.find({ teamLeader: user._id }).select("_id").lean();
	if (!projects.length) return { _id: null };
	return { projectId: { $in: projects.map((project) => project._id) } };
};

const summary = asyncHandler(async (req, res) => {
	const filter = await getAnalyticsTaskFilter(req.user);
	const taskCompletion = await getTaskCompletionRate(filter);
	success(res, { taskCompletion });
});

const teamProductivity = asyncHandler(async (req, res) => {
	const filter = await getAnalyticsTaskFilter(req.user);
	const data = await getUserContribution(filter);
	success(res, data);
});

const projectProgress = asyncHandler(async (req, res) => {
	const filter = req.user.role === "teamLeader" ? { teamLeader: req.user._id } : {};
	const data = await getProjectProgress(filter);
	success(res, data);
});

const dashboard = asyncHandler(async (req, res) => {
	const taskFilter = await getAnalyticsTaskFilter(req.user);
	const projectFilter = req.user.role === "teamLeader" ? { teamLeader: req.user._id } : {};
	const issueFilter = getAnalyticsIssueFilter(req.user);

	const [
		taskCompletion,
		teamPerformance,
		projectStatus,
		tasksByPriority,
		issueStats,
		taskCompletionRate,
	] = await Promise.all([
		getTaskCompletionRate(taskFilter),
		getUserContribution(taskFilter),
		getProjectStatusData(projectFilter),
		getTasksByPriority(taskFilter),
		getIssueStats(issueFilter),
		getTaskCompletionTimeline(taskFilter),
	]);

	const memberPerformance = teamPerformance.map((member) => ({
		name: String(member.userName || "Unknown").split(" ")[0],
		completed: member.tasksCompleted || 0,
		inProgress: member.tasksInProgress || 0,
		score: member.contributionScore || 0,
	}));

	const teamContribution = teamPerformance.map((member) => ({
		name: member.userName || "Unknown",
		score: member.contributionScore || 0,
	}));

	success(res, {
		teamContribution,
		teamPerformance,
		tasksByPriority,
		issueStats,
		memberPerformance,
		taskCompletion,
		taskCompletionRate,
		projectStatus,
	});
});

const router = express.Router();

router.use(authenticate);
router.get("/summary", authorize("admin", "teamLeader"), summary);
router.get("/team-productivity", authorize("admin", "teamLeader"), teamProductivity);
router.get("/project-progress", authorize("admin", "teamLeader"), projectProgress);
router.get("/dashboard", authorize("admin", "teamLeader"), dashboard);

module.exports = router;

