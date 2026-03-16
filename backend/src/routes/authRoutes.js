const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const { User } = require("../models/User");
const { RefreshToken } = require("../models/RefreshToken");
const { asyncHandler } = require("../asyncHandler");
const { success } = require("../response");
const { env } = require("../config/env");
const { validate } = require("../middlewares/validate");

const USER_CODE_PREFIX = {
	admin: "AD",
	teamLeader: "TL",
	teamMember: "TM",
};

const getNextUserCode = async (role) => {
	const prefix = USER_CODE_PREFIX[role];
	if (!prefix) throw new Error("Invalid role for user code");

	const latest = await User.findOne({ role, userCode: new RegExp(`^${prefix}\\d{3}$`) })
		.sort({ userCode: -1 })
		.select("userCode")
		.lean();

	const lastNumber = latest?.userCode ? Number(latest.userCode.slice(prefix.length)) : 0;
	const baseNumber = 100;
	let nextNumber = Math.max(lastNumber, baseNumber) + 1;
	if (nextNumber > 999) {
		throw new Error("User code limit reached for role");
	}

	let candidate = `${prefix}${String(nextNumber).padStart(3, "0")}`;
	while (await User.exists({ userCode: candidate })) {
		nextNumber += 1;
		if (nextNumber > 999) {
			throw new Error("User code limit reached for role");
		}
		candidate = `${prefix}${String(nextNumber).padStart(3, "0")}`;
	}

	return candidate;
};

const signAccessToken = (userId, role) => {
	return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
		expiresIn: env.JWT_ACCESS_EXPIRES_IN,
	});
};

const signRefreshToken = (userId) => {
	return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
		expiresIn: env.JWT_REFRESH_EXPIRES_IN,
	});
};

const verifyRefreshToken = (token) => {
	return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

const registerValidator = [
	body("name")
		.trim()
		.isLength({ min: 2 })
		.withMessage("Name must be at least 2 characters"),
	body("email")
		.trim()
		.isEmail()
		.withMessage("Email must be a valid address"),
	body("password")
		.isString()
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters"),
	body("role")
		.isIn(["teamLeader", "teamMember", "admin"])
		.withMessage("Role must be teamLeader, teamMember, or admin"),
];

const loginValidator = [
	body("email")
		.trim()
		.isEmail()
		.withMessage("Email must be a valid address"),
	body("password")
		.isString()
		.notEmpty()
		.withMessage("Password is required"),
];

const register = asyncHandler(async (req, res) => {
	const { name, email, password, role } = req.body;
	const normalizedEmail = String(email || "").trim().toLowerCase();
	const normalizedName = String(name || "").trim();
	const exists = await User.findOne({ email: normalizedEmail });
	if (exists) {
		return res.status(409).json({ success: false, data: null, message: "Email already registered" });
	}
	const saltRounds = Math.max(10, Number(env.BCRYPT_SALT_ROUNDS) || 12);
	const passwordHash = await bcrypt.hash(password, saltRounds);
	const userCode = await getNextUserCode(role);
	const user = await User.create({
		name: normalizedName,
		email: normalizedEmail,
		passwordHash,
		userCode,
		role,
		status: "pending",
	});
	success(res, { id: user._id, userCode }, "Registration submitted");
});

const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	const normalizedEmail = String(email || "").trim().toLowerCase();
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) {
		return res.status(401).json({ success: false, data: null, message: "Email does not exist", ...(env.NODE_ENV !== "production" ? { reason: "user_not_found" } : {}) });
	}
	if (user.role === "admin" && user.status !== "active") {
		user.status = "active";
		await user.save();
	}
	if (user.status !== "active") {
		return res.status(403).json({
			success: false,
			data: null,
			message: "Account not active. Please wait for admin approval.",
			...(env.NODE_ENV !== "production" ? { reason: `status_${user.status}` } : {}),
		});
	}
	const match = await bcrypt.compare(password, user.passwordHash);
	if (!match) {
		return res.status(401).json({ success: false, data: null, message: "Password does not match", ...(env.NODE_ENV !== "production" ? { reason: "password_mismatch" } : {}) });
	}
	const accessToken = signAccessToken(user._id, user.role);
	const refreshToken = signRefreshToken(user._id);
	await RefreshToken.create({
		user: user._id,
		token: refreshToken,
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	});

	success(res, {
		accessToken,
		refreshToken,
		user: {
			id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			userCode: user.userCode,
			points: user.points || 0,
		},
	});
});

const refresh = asyncHandler(async (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken) {
		return res.status(400).json({ success: false, data: null, message: "Refresh token required" });
	}
	const stored = await RefreshToken.findOne({ token: refreshToken, revoked: false });
	if (!stored) {
		return res.status(401).json({ success: false, data: null, message: "Invalid refresh token" });
	}
	const payload = verifyRefreshToken(refreshToken);
	const accessToken = signAccessToken(payload.sub, payload.role);
	success(res, { accessToken });
});

const logout = asyncHandler(async (req, res) => {
	const { refreshToken } = req.body;
	if (refreshToken) {
		await RefreshToken.updateOne({ token: refreshToken }, { revoked: true });
	}
	success(res, { ok: true }, "Logged out");
});

const router = express.Router();

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;

