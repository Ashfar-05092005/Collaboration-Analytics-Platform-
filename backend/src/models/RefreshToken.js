const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ token: 1 }, { unique: true });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = { RefreshToken };

