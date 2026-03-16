const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { User } = require("../src/models/User");

const USER_CODE_PREFIX = {
  admin: "AD",
  teamLeader: "TL",
  teamMember: "TM",
};

const getMaxNumberForRole = async (role, prefix) => {
  const latest = await User.findOne({ role, userCode: new RegExp(`^${prefix}\\d{3}$`) })
    .sort({ userCode: -1 })
    .select("userCode")
    .lean();

  if (!latest?.userCode) return 0;
  const num = Number(latest.userCode.slice(prefix.length));
  return Number.isFinite(num) ? num : 0;
};

const buildNextCode = async (role, prefix, start) => {
  const baseNumber = 100;
  let nextNumber = Math.max(start, baseNumber) + 1;
  if (nextNumber > 999) {
    throw new Error(`User code limit reached for role ${role}`);
  }

  let candidate = `${prefix}${String(nextNumber).padStart(3, "0")}`;
  while (await User.exists({ userCode: candidate })) {
    nextNumber += 1;
    if (nextNumber > 999) {
      throw new Error(`User code limit reached for role ${role}`);
    }
    candidate = `${prefix}${String(nextNumber).padStart(3, "0")}`;
  }

  return { code: candidate, lastNumber: nextNumber };
};

const fixUserCodes = async () => {
  await connectDB();

  for (const role of Object.keys(USER_CODE_PREFIX)) {
    const prefix = USER_CODE_PREFIX[role];
    let lastNumber = await getMaxNumberForRole(role, prefix);

    const invalidUsers = await User.find({
      role,
      $or: [
        { userCode: { $exists: false } },
        { userCode: "" },
        { userCode: { $not: new RegExp(`^${prefix}\\d{3}$`) } },
      ],
    })
      .sort({ createdAt: 1 })
      .select("_id userCode")
      .lean();

    for (const user of invalidUsers) {
      const next = await buildNextCode(role, prefix, lastNumber);
      lastNumber = next.lastNumber;
      await User.updateOne({ _id: user._id }, { $set: { userCode: next.code } });
      console.log(`Fixed ${role} user ${user._id}: ${user.userCode || "(empty)"} -> ${next.code}`);
    }
  }

  await mongoose.disconnect();
};

fixUserCodes().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
