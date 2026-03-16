const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    userCode: {
      type: String,
      required: true,
      unique: true,
      minlength: 5,
      maxlength: 5,
      validate: {
        validator: function (value) {
          const prefixes = { admin: "AD", teamLeader: "TL", teamMember: "TM" };
          const prefix = prefixes[this.role];
          if (!prefix || typeof value !== "string") return false;
          const pattern = new RegExp(`^${prefix}\\d{3}$`);
          return pattern.test(value);
        },
        message: "User code must match role prefix and 3 digits",
      },
    },
    role: { type: String, enum: ["admin", "teamLeader", "teamMember"], required: true },
    status: { type: String, enum: ["active", "inactive", "pending"], default: "pending" },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ teamId: 1 });

const User = mongoose.model("User", userSchema);

module.exports = { User };

