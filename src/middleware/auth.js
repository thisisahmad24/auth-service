const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorised. No token provided.' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorised. No token provided.' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before accessing this resource.' });
    }

    if (user.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account is temporarily locked.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please refresh your session.' });
    }
    next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to access this resource.' });
  }
  next();
};

module.exports = { protect, requireRole };
