const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    taskId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toHexString(),
      index: true,
      unique: true,
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["assigned", "submitted", "on_review", "changes_requested", "completed"],
      default: "assigned",
    },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    dueDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewComment: { type: String, default: "" },
    reviewRating: { type: Number, min: 1, max: 5, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
taskSchema.index({ assignedBy: 1, status: 1, createdAt: -1 });
taskSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
taskSchema.index({ projectId: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = { Task };

