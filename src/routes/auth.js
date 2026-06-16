const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  register,
  verifyEmail,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  resendVerification,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: 'Too many email requests. Please try again in 1 hour.' },
});

// ─── Validators ───────────────────────────────────────────────────────────────
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────
router.post('/register', authLimiter, registerValidation, register);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);
router.post('/login', authLimiter, loginValidation, login);
router.get('/me', protect, getMe);
router.post('/forgot-password', emailLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
