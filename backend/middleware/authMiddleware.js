const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforattendance');

      // Attach user to req without password
      req.user = await Teacher.findOne({ teacherId: decoded.id }).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, teacher not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied, administrator only' });
  }
};

module.exports = { protect, adminOnly };
