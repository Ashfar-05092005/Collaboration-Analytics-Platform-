const mongoose = require("mongoose");

const pointTransactionSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    points: { type: Number, required: true },
    reason: { type: String, default: "" },
    type: { type: String, enum: ["award", "transfer"], required: true },
  },
  { timestamps: true }
);

pointTransactionSchema.index({ fromUser: 1, createdAt: -1 });
pointTransactionSchema.index({ toUser: 1, createdAt: -1 });

const PointTransaction = mongoose.model("PointTransaction", pointTransactionSchema);

module.exports = { PointTransaction };
