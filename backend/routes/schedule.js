const express = require('express');
const router = express.Router();
const AcademicDay = require('../models/AcademicDay');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Helper to format Date to YYYY-MM-DD
function getTodayString(mockDate) {
  const d = mockDate ? new Date(mockDate) : new Date();
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

// Recalculate schedule day numbers from a starting date forward
const recalculateSchedule = async (startDateStr) => {
  // Find all academic days starting from startDateStr, ordered by date ascending
  const days = await AcademicDay.find({ date: { $gte: startDateStr } }).sort({ date: 1 });
  
  // Find the last non-holiday working day before startDateStr to determine where to resume the Day 1-10 sequence
  const prevDay = await AcademicDay.findOne({ 
    date: { $lt: startDateStr }, 
    isHoliday: false 
  }).sort({ date: -1 });

  let nextDayNum = prevDay ? (prevDay.dayNumber === 10 ? 1 : prevDay.dayNumber + 1) : 1;

  for (let day of days) {
    if (day.isHoliday) {
      day.dayNumber = null;
      // Keep its description if set as a custom holiday, otherwise default to Holiday
      if (!day.description.startsWith('Holiday') && day.description !== 'Saturday' && day.description !== 'Sunday') {
        day.description = 'Holiday';
      }
    } else {
      day.dayNumber = nextDayNum;
      day.description = `Day ${nextDayNum}`;
      nextDayNum = nextDayNum === 10 ? 1 : nextDayNum + 1;
    }
    await day.save();
  }
};

// @desc    Get academic day info for today or a specific date (mock support)
// @route   GET /api/schedule/today
// @access  Private
router.get('/today', protect, async (req, res) => {
  // If query parameter ?date=YYYY-MM-DD is passed, use that date (for mocking/testing)
  const queryDate = req.query.date || getTodayString();

  try {
    let academicDay = await AcademicDay.findOne({ date: queryDate });

    // If date is outside seeded range (July 2, 2026 - Aug 31, 2026), dynamically create it
    if (!academicDay) {
      const d = new Date(queryDate);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      academicDay = new AcademicDay({
        date: queryDate,
        isHoliday: isWeekend,
        dayNumber: null,
        description: isWeekend ? (dayOfWeek === 0 ? 'Sunday' : 'Saturday') : 'Unscheduled Workday'
      });
      await academicDay.save();
    }

    res.json(academicDay);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get all schedule days
// @route   GET /api/schedule/all
// @access  Private
router.get('/all', protect, async (req, res) => {
  try {
    const days = await AcademicDay.find({}).sort({ date: 1 });
    res.json(days);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Toggle holiday status for a date and trigger recalculation
// @route   POST /api/schedule/holiday
// @access  Private/Admin
router.post('/holiday', protect, adminOnly, async (req, res) => {
  const { date, isHoliday, description } = req.body; // date = YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ message: 'Please provide a valid date.' });
  }

  try {
    let day = await AcademicDay.findOne({ date });

    if (!day) {
      day = new AcademicDay({ date });
    }

    day.isHoliday = isHoliday;
    day.description = description || (isHoliday ? 'Holiday' : 'Working Day');
    
    if (isHoliday) {
      day.dayNumber = null;
    }

    await day.save();

    // Trigger recalculation from this day forward
    await recalculateSchedule(date);

    res.json({ message: `Holiday status updated for ${date} and schedule recalculated successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
