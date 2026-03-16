const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    projectId: { type: String, index: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "completed", "on-hold"], default: "active" },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSchema.index({ teamLeader: 1, status: 1 });

projectSchema.pre("validate", async function (next) {
  if (!this.isNew || this.projectId) return next();

  const prefix = "PRJ";
  const latest = await this.constructor
    .findOne({ projectId: new RegExp(`^${prefix}\\d{3}$`) })
    .sort({ projectId: -1 })
    .select("projectId")
    .lean();

  let nextNumber = 1;
  if (latest?.projectId) {
    const num = Number(latest.projectId.slice(prefix.length));
    if (Number.isFinite(num)) nextNumber = num + 1;
  }

  if (nextNumber > 999) {
    return next(new Error("Project ID limit reached"));
  }

  this.projectId = `${prefix}${String(nextNumber).padStart(3, "0")}`;
  return next();
});

const Project = mongoose.model("Project", projectSchema);

module.exports = { Project };

