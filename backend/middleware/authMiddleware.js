const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforattendance');

      // Try finding user as a Teacher
      let user = await Teacher.findOne({ teacherId: decoded.id }).select('-password');
      
      // If not found, try finding as a Student
      if (!user) {
        user = await Student.findOne({ registerNumber: decoded.id }).select('-password');
      }

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Attach user to request
      req.user = user;
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
  if (req.user && ['admin', 'superadmin', 'hod'].includes(req.user.role)) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied, administrator only' });
  }
};

module.exports = { protect, adminOnly };
