const express = require("express");
const { Team } = require("../models/Team");
const { User } = require("../models/User");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");

const parsePagination = (query) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
	return { page, limit, skip: (page - 1) * limit };
};

const createTeam = asyncHandler(async (req, res) => {
	const team = await Team.create(req.body);
	success(res, team, "Team created");
});

const listTeams = asyncHandler(async (req, res) => {
	const { page, limit, skip } = parsePagination(req.query);
	const [teams, total] = await Promise.all([
		Team.find()
			.select("name leader members status createdAt")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean(),
		Team.countDocuments({}),
	]);
	success(res, { items: teams, page, limit, total });
});

const getTeam = asyncHandler(async (req, res) => {
	const team = await Team.findById(req.params.id).lean();
	if (!team) return res.status(404).json({ success: false, data: null, message: "Not found" });
	success(res, team);
});

const removeTeamMember = asyncHandler(async (req, res) => {
	const { id, memberId } = req.params;
	const reason = (req.body?.reason || "").trim();
	if (!reason) {
		return res.status(400).json({ success: false, data: null, message: "Removal reason is required" });
	}

	const teamFilter = { _id: id };
	if (req.user.role === "teamLeader") {
		teamFilter.leader = req.user._id;
	}

	const team = await Team.findOne(teamFilter);
	if (!team) return res.status(404).json({ success: false, data: null, message: "Not found" });

	const isMemberInTeam = (team.members || []).some((member) => String(member) === String(memberId));
	if (!isMemberInTeam) {
		return res.status(400).json({ success: false, data: null, message: "User is not a member of this team" });
	}

	const removeResult = await Team.updateOne(
		{ _id: team._id },
		{ $pull: { members: memberId } }
	);

	if (!removeResult.modifiedCount) {
		return res.status(500).json({ success: false, data: null, message: "Failed to remove team member" });
	}

	await User.updateOne(
		{ _id: memberId, teamId: team._id },
		{ $set: { teamId: null } }
	);

	await Notification.create({
		user: memberId,
		type: "team_member_removed",
		title: "Removed from team",
		message: `You were removed from team \"${team.name}\" by ${req.user.name}. Reason: ${reason}`,
	});

	success(res, { id: team._id, memberId, reason }, "Team member removed");
});

const router = express.Router();

router.use(authenticate);
router.post("/", authorize("admin"), createTeam);
router.get("/", authorize("admin", "teamLeader"), listTeams);
router.get("/:id", authorize("admin", "teamLeader"), getTeam);
router.delete("/:id/members/:memberId", authorize("admin", "teamLeader"), removeTeamMember);

module.exports = router;

