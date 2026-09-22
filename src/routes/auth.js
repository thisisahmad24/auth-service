const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  register, verifyEmail, login, refresh, logout, getMe,
  forgotPassword, resetPassword, resendVerification, adminOnly,
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many email requests. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  ...passwordValidation,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const emailValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
];

router.post('/register', authLimiter, registerValidation, register);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', emailLimiter, emailValidation, resendVerification);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/admin', protect, requireRole('admin'), adminOnly);
router.post('/forgot-password', emailLimiter, emailValidation, forgotPassword);
router.post('/reset-password/:token', authLimiter, passwordValidation, resetPassword);

module.exports = router;
