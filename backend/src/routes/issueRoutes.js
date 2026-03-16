const express = require("express");
const { Issue } = require("../models/Issue");
const { ActivityLog } = require("../models/ActivityLog");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { authenticate, authorize } = require("../middlewares/auth");

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const populateIssue = (query) =>
  query
    .populate("reportedBy", "name email")
    .populate("taskId", "title")
    .populate("escalatedToTL", "name")
    .populate("resolvedBy", "name");

const formatIssue = (issue) => {
  if (!issue) return issue;
  return {
    id: issue._id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority,
    status: issue.status,
    reportedBy: issue.reportedBy?._id,
    reportedByName: issue.reportedBy?.name || "",
    taskId: issue.taskId?._id,
    taskName: issue.taskId?.title || "",
    escalatedToTL: issue.escalatedToTL?._id,
    escalatedToAdmin: issue.escalatedToAdmin,
    resolution: issue.resolution,
    resolvedBy: issue.resolvedBy?.name || "",
    resolvedAt: issue.resolvedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
};

const reportIssue = asyncHandler(async (req, res) => {
  const { title, description, category, priority, taskId } = req.body;

  const issue = await Issue.create({
    title,
    description,
    category,
    priority,
    taskId: taskId || null,
    reportedBy: req.user._id,
  });

  await ActivityLog.create({
    type: "issue_reported",
    entityType: "issue",
    entityId: issue._id,
    actor: req.user._id,
  });

  const populated = await populateIssue(Issue.findById(issue._id));
  success(res, formatIssue(populated), "Issue reported successfully");
});

const listIssues = asyncHandler(async (req, res) => {
  const { status, priority, category, escalatedOnly, forTeamLeader } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  if (req.user.role === "teamMember") {
    filter.reportedBy = req.user._id;
  } else if (req.user.role === "teamLeader") {
    if (forTeamLeader === "true") {
      filter.escalatedToTL = req.user._id;
    } else {
      filter.reportedBy = req.user._id;
    }
  } else if (req.user.role === "admin" && escalatedOnly === "true") {
    filter.escalatedToAdmin = true;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [issues, total] = await Promise.all([
    populateIssue(
      Issue.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ).lean(),
    Issue.countDocuments(filter),
  ]);
  success(res, { items: issues.map(formatIssue), page, limit, total });
});

const getIssue = asyncHandler(async (req, res) => {
  const issue = await populateIssue(Issue.findById(req.params.id));
  if (!issue) return res.status(404).json({ success: false, data: null, message: "Issue not found" });
  success(res, formatIssue(issue));
});

const updateIssueStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const issue = await populateIssue(
    Issue.findByIdAndUpdate(req.params.id, { status }, { new: true })
  );
  if (!issue) return res.status(404).json({ success: false, data: null, message: "Issue not found" });

  await ActivityLog.create({
    type: "issue_status_updated",
    entityType: "issue",
    entityId: issue._id,
    actor: req.user._id,
    metadata: { status },
  });

  success(res, formatIssue(issue), "Issue status updated");
});

const resolveIssue = asyncHandler(async (req, res) => {
  const { resolution } = req.body;

  const issue = await populateIssue(
    Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "resolved",
        resolution,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
      },
      { new: true }
    )
  );

  if (!issue) return res.status(404).json({ success: false, data: null, message: "Issue not found" });

  await ActivityLog.create({
    type: "issue_resolved",
    entityType: "issue",
    entityId: issue._id,
    actor: req.user._id,
  });

  success(res, formatIssue(issue), "Issue resolved successfully");
});

const escalateIssue = asyncHandler(async (req, res) => {
  const { escalationReason } = req.body;

  const issue = await populateIssue(
    Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "escalated",
        escalatedToAdmin: true,
        resolution: escalationReason,
      },
      { new: true }
    )
  );

  if (!issue) return res.status(404).json({ success: false, data: null, message: "Issue not found" });

  await ActivityLog.create({
    type: "issue_escalated",
    entityType: "issue",
    entityId: issue._id,
    actor: req.user._id,
  });

  success(res, formatIssue(issue), "Issue escalated to Admin");
});

const router = express.Router();

router.use(authenticate);

// Report new issue (all users)
router.post("/", authorize("admin", "teamLeader", "teamMember"), reportIssue);

// List issues (role-based)
router.get("/", authorize("admin", "teamLeader", "teamMember"), listIssues);

// Get specific issue
router.get("/:id", authorize("admin", "teamLeader", "teamMember"), getIssue);

// Update issue status
router.patch("/:id/status", authorize("admin", "teamLeader"), updateIssueStatus);

// Resolve issue (admin/teamLeader)
router.patch("/:id/resolve", authorize("admin", "teamLeader"), resolveIssue);

// Escalate issue to admin (teamLeader only)
router.patch("/:id/escalate", authorize("teamLeader"), escalateIssue);

module.exports = router;

