const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const AcademicDay = require('../models/AcademicDay');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Period time definitions in minutes since midnight
const PERIOD_WINDOWS = {
  1: { start: 9*60 + 5,   end: 9*60 + 55,   label: 'Period 1 (09:05 AM - 09:55 AM)' },
  2: { start: 9*60 + 55,  end: 10*60 + 45,  label: 'Period 2 (09:55 AM - 10:45 AM)' },
  3: { start: 11*60,      end: 11*60 + 50,  label: 'Period 3 (11:00 AM - 11:50 AM)' },
  4: { start: 11*60 + 50, end: 12*60 + 40,  label: 'Period 4 (11:50 AM - 12:40 PM)' },
  5: { start: 13*60 + 40, end: 14*60 + 30,  label: 'Period 5 (01:40 PM - 02:30 PM)' },
  6: { start: 14*60 + 30, end: 15*60 + 20,  label: 'Period 6 (02:30 PM - 03:20 PM)' },
  7: { start: 15*60 + 35, end: 16*60 + 25,  label: 'Period 7 (03:35 PM - 04:25 PM)' }
};

// Helper: Parse HH:MM to minutes since midnight
const getMinutesSinceMidnight = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper: Get current minutes since midnight based on system time or mock header
const getCurrentTimeInMinutes = (req) => {
  const mockTime = req.headers['x-mock-time'] || req.query.mockTime;
  if (mockTime) {
    return getMinutesSinceMidnight(mockTime);
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Check if marking is open (only during period)
const isMarkingOpen = (period, req) => {
  const currentTime = getCurrentTimeInMinutes(req);
  const window = PERIOD_WINDOWS[period];
  if (!window) return false;
  return currentTime >= window.start && currentTime <= window.end;
};

// Check if grace period for correction is open (during period + 15 minutes after)
const isGracePeriodOpen = (period, req) => {
  const currentTime = getCurrentTimeInMinutes(req);
  const window = PERIOD_WINDOWS[period];
  if (!window) return false;
  return currentTime >= window.start && currentTime <= (window.end + 15);
};

// @desc    Get student list for attendance
// @route   GET /api/attendance/students
// @access  Private
// Query params: ?department=IT&year=4&section=A (optional - if not provided, inferred from timetable)
router.get('/students', protect, async (req, res) => {
  try {
    let { department, year, section } = req.query;

    // If params not provided, try to infer from teacher's timetable assignment
    if (!department || !year || !section) {
      if (req.user.role === 'admin') {
        // Admin sees all students
        const students = await Student.find({}).sort({ registerNumber: 1 });
        return res.json(students);
      }
      // Since the prototype database contains only IT students, default to 'IT' department to allow all faculty to mark this class
      department = 'IT';
      year = 4;
      section = 'A';
    }

    const students = await Student.find({
      department,
      year: Number(year),
      section
    }).sort({ registerNumber: 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get attendance status & summary for a date, day, and period
// @route   GET /api/attendance/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  const { date, period, timetableDay } = req.query;

  if (!date || !period || !timetableDay) {
    return res.status(400).json({ message: 'Please specify date, timetableDay, and period.' });
  }

  try {
    const records = await Attendance.find({ date, period: Number(period) })
      .populate('studentRegisterNumber', 'name registerNumber department year section');

    if (records.length === 0) {
      // Check if current user is assigned to this timetable day & period
      const slot = await Timetable.findOne({ dayNumber: Number(timetableDay), periodNumber: Number(period) });
      
      const teacherAssigned = slot ? slot.teacherId : null;
      const isAllowedToMark = req.user.role === 'admin' || req.user.teacherId === teacherAssigned;

      const markingOpen = isMarkingOpen(Number(period), req);

      return res.json({
        marked: false,
        isAllowedToMark,
        markingOpen,
        assignedTeacher: slot ? slot.teacherId : null,
        subject: slot ? slot.subjectAcronym : null,
        periodLabel: PERIOD_WINDOWS[period]?.label || `Period ${period}`
      });
    }

    // Attendance is already marked. Compute summaries
    const presentCount = records.filter(r => r.status === 'Present').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const odCount = records.filter(r => r.status === 'OD').length;
    const lateCount = records.filter(r => r.status === 'Late').length;

    // Check if editing is allowed (grace period or admin override)
    const graceOpen = isGracePeriodOpen(Number(period), req);
    const adminAllowed = records.some(r => r.correctionAllowed);
    const isAllowedToEdit = (req.user.role === 'admin' || req.user.teacherId === records[0].teacherId) && (graceOpen || adminAllowed);

    res.json({
      marked: true,
      subject: records[0].subject,
      teacherId: records[0].teacherId,
      records: records.map(r => ({
        studentRegisterNumber: r.studentRegisterNumber?.registerNumber || r.studentRegisterNumber,
        name: r.studentRegisterNumber?.name || '',
        department: r.studentRegisterNumber?.department || '',
        year: r.studentRegisterNumber?.year || '',
        section: r.studentRegisterNumber?.section || '',
        status: r.status,
        correctionAllowed: r.correctionAllowed
      })),
      summary: {
        total: records.length,
        present: presentCount,
        absent: absentCount,
        od: odCount,
        late: lateCount
      },
      isAllowedToEdit,
      graceOpen,
      adminAllowed,
      periodLabel: PERIOD_WINDOWS[period]?.label || `Period ${period}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Submit attendance for a period
// @route   POST /api/attendance/submit
// @access  Private
router.post('/submit', protect, async (req, res) => {
  const { date, timetableDay, period, subject, records, mockTime } = req.body;

  if (!date || !timetableDay || !period || !subject || !records) {
    return res.status(400).json({ message: 'Missing required attendance fields.' });
  }

  try {
    // 1. Verify if attendance is already marked
    const existing = await Attendance.findOne({ date, period: Number(period) });
    if (existing) {
      return res.status(400).json({ message: 'Attendance already submitted for this period.' });
    }

    // 2. Validate Teacher Authorization
    const slot = await Timetable.findOne({ dayNumber: Number(timetableDay), periodNumber: Number(period) });
    if (!slot) {
      return res.status(400).json({ message: 'No class scheduled for this period.' });
    }

    if (req.user.role !== 'admin' && slot.teacherId !== req.user.teacherId) {
      return res.status(403).json({ message: 'Unauthorized. You are not assigned to mark this class.' });
    }

    // 3. Validate Time-Based Restriction
    const reqWithMock = { headers: {}, query: {} };
    if (mockTime) reqWithMock.query.mockTime = mockTime;
    
    if (req.user.role !== 'admin' && !isMarkingOpen(Number(period), reqWithMock)) {
      const window = PERIOD_WINDOWS[period];
      return res.status(400).json({
        message: `Attendance can only be marked during the scheduled period time (${window?.label || ''}).`
      });
    }

    // 4. Save Attendance Records
    const attendanceEntries = records.map(rec => ({
      studentRegisterNumber: rec.studentRegisterNumber,
      date,
      timetableDay: Number(timetableDay),
      period: Number(period),
      subject,
      teacherId: req.user.role === 'admin' ? slot.teacherId : req.user.teacherId,
      status: rec.status, // 'Present', 'Absent', 'OD'
      correctionAllowed: false
    }));

    await Attendance.insertMany(attendanceEntries);

    // Emit live update signal
    req.app.get('io')?.emit('attendance_updated', { date, period, timetableDay, subject });

    res.status(201).json({ message: 'Attendance submitted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Edit existing attendance
// @route   PUT /api/attendance/edit
// @access  Private
router.put('/edit', protect, async (req, res) => {
  const { date, period, records, mockTime } = req.body;

  if (!date || !period || !records) {
    return res.status(400).json({ message: 'Missing required attendance fields.' });
  }

  try {
    // 1. Fetch existing attendance records
    const existingRecords = await Attendance.find({ date, period: Number(period) });
    if (existingRecords.length === 0) {
      return res.status(404).json({ message: 'No attendance records found to edit.' });
    }

    // 2. Validate authorization (only admin or assigned teacher)
    if (req.user.role !== 'admin' && existingRecords[0].teacherId !== req.user.teacherId) {
      return res.status(403).json({ message: 'Unauthorized to edit attendance for this period.' });
    }

    // 3. Validate Correction Permissions (grace period OR admin override)
    const reqWithMock = { headers: {}, query: {} };
    if (mockTime) reqWithMock.query.mockTime = mockTime;

    const graceOpen = isGracePeriodOpen(Number(period), reqWithMock);
    const adminAllowed = existingRecords.some(r => r.correctionAllowed);

    if (req.user.role !== 'admin' && !graceOpen && !adminAllowed) {
      return res.status(400).json({
        message: 'Correction window has closed. Please request edit permission from the administrator.'
      });
    }

    // 4. Update status for each student
    for (let rec of records) {
      await Attendance.findOneAndUpdate(
        { date, period: Number(period), studentRegisterNumber: rec.studentRegisterNumber },
        { 
          status: rec.status,
          // Reset correctionAllowed flag once edited, so they can't edit infinitely
          correctionAllowed: false 
        }
      );
    }

    // Emit live update signal
    req.app.get('io')?.emit('attendance_updated', { date, period });

    res.json({ message: 'Attendance updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Grant correction permission to a class period
// @route   POST /api/attendance/grant-correction
// @access  Private/Admin
router.post('/grant-correction', protect, adminOnly, async (req, res) => {
  const { date, period } = req.body;

  if (!date || !period) {
    return res.status(400).json({ message: 'Please specify date and period.' });
  }

  try {
    const result = await Attendance.updateMany(
      { date, period: Number(period) },
      { correctionAllowed: true }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'No attendance records found for this date and period.' });
    }

    res.json({ message: `Correction permission granted for period ${period} on ${date}.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
