const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = { ActivityLog };

