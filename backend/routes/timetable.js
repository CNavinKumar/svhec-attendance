const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/authMiddleware');

// Standard timings for reference
const PERIOD_TIMINGS = [
  { period: 1, startTime: '09:05', endTime: '09:55', label: '09:05 AM - 09:55 AM' },
  { period: 2, startTime: '09:55', endTime: '10:45', label: '09:55 AM - 10:45 AM' },
  { period: 3, startTime: '11:00', endTime: '11:50', label: '11:00 AM - 11:50 AM' },
  { period: 4, startTime: '11:50', endTime: '12:40', label: '11:50 AM - 12:40 PM' },
  { period: 5, startTime: '13:40', endTime: '14:30', label: '01:40 PM - 02:30 PM' },
  { period: 6, startTime: '14:30', endTime: '15:20', label: '02:30 PM - 03:20 PM' },
  { period: 7, startTime: '15:35', endTime: '16:25', label: '03:35 PM - 04:25 PM' }
];

// @desc    Get complete timetable for a specific Day number
// @route   GET /api/timetable/day/:dayNumber
// @access  Private
router.get('/day/:dayNumber', protect, async (req, res) => {
  const dayNumber = parseInt(req.params.dayNumber);

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 10) {
    return res.status(400).json({ message: 'Invalid Day Number (must be 1-10)' });
  }

  try {
    const slots = await Timetable.find({ dayNumber }).sort({ periodNumber: 1 });
    
    // Merge slots with timings
    const timetableWithTimings = PERIOD_TIMINGS.map(t => {
      const slot = slots.find(s => s.periodNumber === t.period);
      return {
        period: t.period,
        startTime: t.startTime,
        endTime: t.endTime,
        label: t.label,
        assigned: slot ? true : false,
        subjectAcronym: slot ? slot.subjectAcronym : 'FREE',
        subjectName: slot ? slot.subjectName : 'Free Period',
        teacherId: slot ? slot.teacherId : null,
        classroom: slot ? slot.classroom : ''
      };
    });

    res.json({
      dayNumber,
      periods: timetableWithTimings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get timetable slots assigned to the logged-in teacher for a specific Day number
// @route   GET /api/timetable/my-schedule/:dayNumber
// @access  Private
router.get('/my-schedule/:dayNumber', protect, async (req, res) => {
  const dayNumber = parseInt(req.params.dayNumber);
  const teacherId = req.user.teacherId;

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 10) {
    return res.status(400).json({ message: 'Invalid Day Number (must be 1-10)' });
  }

  try {
    // Allow teachers to view all scheduled slots for the day so they can monitor and substitute multiple classes
    const query = { dayNumber };
    
    const slots = await Timetable.find(query).sort({ periodNumber: 1 });

    const schedule = PERIOD_TIMINGS.map(t => {
      const slot = slots.find(s => s.periodNumber === t.period);
      return {
        period: t.period,
        startTime: t.startTime,
        endTime: t.endTime,
        label: t.label,
        assigned: !!slot,
        subjectAcronym: slot ? slot.subjectAcronym : 'FREE',
        subjectName: slot ? slot.subjectName : 'Free Period',
        teacherId: slot ? slot.teacherId : null,
        classroom: slot ? slot.classroom : ''
      };
    });

    res.json({
      dayNumber,
      schedule
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
