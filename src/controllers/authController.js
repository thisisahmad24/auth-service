const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');

const issueSession = async (user) => {
  const accessToken = generateToken(user);
  const refreshToken = newToken();

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpires = Date.now() + REFRESH_TOKEN_TTL_MS;
  await user.save();

  return { accessToken, refreshToken };
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return next(createError('An account with that email already exists.', 409));

    const verifyToken = newToken();
    const user = await User.create({
      name,
      email,
      password,
      emailVerifyToken: hashToken(verifyToken),
      emailVerifyExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await sendVerificationEmail(user, verifyToken);

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({
      emailVerifyToken: hashToken(req.params.token),
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!user) return next(createError('Verification link is invalid or has expired.', 400));

    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) return next(createError('Invalid email or password.', 401));
    if (user.isLocked()) return next(createError('Account temporarily locked. Try again later.', 423));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return next(createError('Invalid email or password.', 401));
    }

    if (!user.isVerified) return next(createError('Please verify your email address before logging in.', 403));

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    const { accessToken, refreshToken } = await issueSession(user);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token: accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return next(createError('Refresh token is required.', 400));
    }

    const user = await User.findOne({
      refreshTokenHash: hashToken(refreshToken),
      refreshTokenExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) return next(createError('Invalid or expired refresh token.', 401));
    if (!user.isVerified) return next(createError('Please verify your email address before refreshing your session.', 403));

    const session = await issueSession(user);
    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      token: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    req.user.refreshTokenHash = undefined;
    req.user.refreshTokenExpires = undefined;
    await req.user.save();
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
};

exports.adminOnly = async (req, res) => {
  res.json({ success: true, message: 'Admin access granted.', user: publicUser(req.user) });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError('Please provide your email.', 400));

    const user = await User.findOne({ email });
    const message = 'If an account with that email exists, a reset link has been sent.';

    if (!user) return res.json({ success: true, message });

    const resetToken = newToken();
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(user, resetToken);
    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return next(createError('Password must be at least 8 characters and contain an uppercase letter and a number.', 400));
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(req.params.token),
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) return next(createError('Reset link is invalid or has expired.', 400));

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash = undefined;
    user.refreshTokenExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError('Please provide your email.', 400));

    const user = await User.findOne({ email });
    const message = 'If that email is registered and unverified, a new link has been sent.';

    if (!user || user.isVerified) return res.json({ success: true, message });

    const verifyToken = newToken();
    user.emailVerifyToken = hashToken(verifyToken);
    user.emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user, verifyToken);
    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};
