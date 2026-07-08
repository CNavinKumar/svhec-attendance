const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/authMiddleware');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeyforattendance', {
    expiresIn: '30d',
  });
};

// @desc    Auth teacher/admin & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const teacher = await Teacher.findOne({ email });

    if (teacher && (await teacher.matchPassword(password))) {
      res.json({
        teacherId: teacher.teacherId,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        assignedSubjects: teacher.assignedSubjects,
        role: teacher.role,
        token: generateToken(teacher.teacherId),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
