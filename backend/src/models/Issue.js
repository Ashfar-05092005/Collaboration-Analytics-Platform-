const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["technical", "resource", "communication", "other"],
      default: "technical",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in-review", "escalated", "resolved"],
      default: "open",
    },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    escalatedToTL: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    escalatedToAdmin: { type: Boolean, default: false },
    resolution: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

issueSchema.index({ reportedBy: 1, createdAt: -1 });
issueSchema.index({ escalatedToTL: 1, status: 1 });
issueSchema.index({ escalatedToAdmin: 1, status: 1 });
issueSchema.index({ status: 1, priority: 1, createdAt: -1 });
issueSchema.index({ category: 1, createdAt: -1 });

const Issue = mongoose.model("Issue", issueSchema);

module.exports = { Issue };

