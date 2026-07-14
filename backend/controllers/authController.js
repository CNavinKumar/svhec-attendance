const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const RefreshToken = require('../models/RefreshToken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforattendance';
const JWT_EXPIRES_IN = '1h'; // short-lived access token
const REFRESH_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Helper to generate access token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Helper to generate a refresh token
const generateAndSaveRefreshToken = async (userId, userModel) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_IN);

  // Save to DB
  await RefreshToken.create({
    token,
    userId,
    userModel,
    expiresAt
  });

  return token;
};

// Login user (Teacher, Admin, HOD, Super Admin, or Student)
exports.login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  try {
    let user = null;
    let userModel = '';
    let userId = '';

    // First try finding in Teacher
    user = await Teacher.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      userModel = 'Teacher';
      userId = user.teacherId;
    } else {
      // Try finding in Student
      user = await Student.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        userModel = 'Student';
        userId = user.registerNumber;
      }
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(userId);
    const refreshToken = await generateAndSaveRefreshToken(userId, userModel);

    // Set cookie if needed or send in response
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      ...userObj,
      token: accessToken,
      refreshToken,
      rememberMe: !!rememberMe,
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Refresh Access Token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      if (tokenDoc) await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    // Refresh token is valid, generate new access token
    const newAccessToken = generateAccessToken(tokenDoc.userId);
    
    // Rotate refresh token (generate new refresh token, delete old)
    const newRefreshToken = await generateAndSaveRefreshToken(tokenDoc.userId, tokenDoc.userModel);
    await RefreshToken.deleteOne({ _id: tokenDoc._id });

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error during token refresh.' });
  }
};

// Logout (revoke refresh token)
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout.' });
  }
};

// Validate token and return fresh user details
exports.validate = async (req, res) => {
  try {
    let user = req.user; // populated by protect middleware
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error during validation.' });
  }
};
