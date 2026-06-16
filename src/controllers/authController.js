const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// ─── Helper ───────────────────────────────────────────────────────────────────
const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError('An account with that email already exists.', 409));
    }

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      emailVerifyToken: verifyToken,
      emailVerifyExpires: verifyExpires,
    });

    // Send verification email
    await sendVerificationEmail(user, verifyToken);

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(createError('Verification link is invalid or has expired.', 400));
    }

    // Mark user as verified, clear the token
    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(createError('Invalid email or password.', 401));
    }

    // Check if account is locked
    if (user.isLocked()) {
      const unlockTime = new Date(user.lockUntil).toLocaleTimeString();
      return next(createError(`Account locked due to too many failed attempts. Try again after ${unlockTime}.`, 423));
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return next(createError('Invalid email or password.', 401));
    }

    // Check email verified
    if (!user.isVerified) {
      return next(createError('Please verify your email address before logging in.', 403));
    }

    // Reset login attempts on success
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Issue JWT
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get current user (protected) ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
    },
  });
};

// ─── Forgot password ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError('Please provide your email.', 400));

    const user = await User.findOne({ email });

    // Always return 200 — don't reveal if email exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Reset password ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return next(createError('Password must be at least 8 characters.', 400));
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(createError('Reset link is invalid or has expired.', 400));
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Resend verification email ────────────────────────────────────────────────
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError('Please provide your email.', 400));

    const user = await User.findOne({ email });

    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered and unverified, a new link has been sent.',
      });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user, verifyToken);

    res.status(200).json({
      success: true,
      message: 'If that email is registered and unverified, a new link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};
