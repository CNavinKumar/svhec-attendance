const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const AcademicDay = require('../models/AcademicDay');
const Timetable = require('../models/Timetable');

const pad2 = n => String(n).padStart(2, '0');

// GET /api/admin/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().split('T')[0];

    const [totalStudents, totalFaculty, todayRecords, academicDay, allDays] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Attendance.find({ date: today }),
      AcademicDay.findOne({ date: today }),
      AcademicDay.find({})
    ]);

    const todayPresent = todayRecords.filter(r => r.status === 'Present').length;
    const todayAbsent  = todayRecords.filter(r => r.status === 'Absent').length;
    const todayOD      = todayRecords.filter(r => r.status === 'OD').length;


    // Periods marked today
    const periodsMarkedToday = [...new Set(todayRecords.map(r => r.period))];

    // Total working days vs holidays this academic year
    const workingDays = allDays.filter(d => !d.isHoliday).length;
    const holidays = allDays.filter(d => d.isHoliday).length;

    res.json({
      totalStudents,
      totalFaculty,
      today,
      isHoliday: academicDay ? academicDay.isHoliday : false,
      holidayDesc: academicDay ? academicDay.description : '',
      workingDays,
      holidays,
      todayAttendance: {
        totalRecords: todayRecords.length,
        present: todayPresent,
        absent: todayAbsent,
        od: todayOD,
        periodsMarked: periodsMarkedToday.sort(),
        percentage: todayRecords.length > 0
          ? Math.round(((todayPresent + todayOD) / todayRecords.length) * 100)
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/master-attendance/month
// Consolidates monthly summaries into a single fast call
exports.getMonthSummary = async (req, res) => {
  const { month, year, department, yearOfStudy, section } = req.query;

  if (!month || !year || !department || !yearOfStudy || !section) {
    return res.status(400).json({ message: 'Specify month (1-12), year, department, yearOfStudy (1-4), and section.' });
  }

  try {
    const monthRegex = `^${year}-${pad2(month)}`;
    
    // 1. Fetch Students matching department/year/section
    const students = await Student.find({
      department,
      year: Number(yearOfStudy),
      section
    }).select('registerNumber name');

    const regNums = students.map(s => s.registerNumber);

    // 2. Fetch Academic Days in this month
    const academicDays = await AcademicDay.find({ date: { $regex: monthRegex } }).sort({ date: 1 });

    // 3. Fetch Attendance records in this month for these students
    const attendanceRecords = await Attendance.find({
      date: { $regex: monthRegex },
      studentRegisterNumber: { $in: regNums }
    });

    // 4. Fetch Timetable mapping to check faculty assignment
    const timetables = await Timetable.find({});
    const facultyMap = {};
    const teachers = await Teacher.find({}).select('teacherId name');
    const teacherNames = {};
    teachers.forEach(t => { teacherNames[t.teacherId] = t.name; });

    // Build day map
    const summaryByDate = {};

    academicDays.forEach(day => {
      const dateStr = day.date;
      summaryByDate[dateStr] = {
        date: dateStr,
        isHoliday: day.isHoliday,
        description: day.description,
        dayNumber: day.dayNumber,
        percentage: null,
        present: 0,
        absent: 0,
        periodsMarked: [],
        assignedFaculty: []
      };

      if (!day.isHoliday && day.dayNumber) {
        // Find periods scheduled for this dayNumber
        const daySlots = timetables.filter(t => t.dayNumber === day.dayNumber);
        const dayFacultyIds = [...new Set(daySlots.map(s => s.teacherId))];
        summaryByDate[dateStr].assignedFaculty = dayFacultyIds.map(id => teacherNames[id] || id);

        // Filter attendance records for this date
        const dayAtt = attendanceRecords.filter(r => r.date === dateStr);
        if (dayAtt.length > 0) {
          const markedPeriods = [...new Set(dayAtt.map(r => r.period))];
          summaryByDate[dateStr].periodsMarked = markedPeriods.sort();

          const total = dayAtt.length;
          const present = dayAtt.filter(r => ['Present', 'OD'].includes(r.status)).length;
          const absent = total - present;
          
          summaryByDate[dateStr].present = present;
          summaryByDate[dateStr].absent = absent;
          summaryByDate[dateStr].percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        }
      }
    });

    res.json({
      month,
      year,
      summaries: Object.values(summaryByDate)
    });
  } catch (error) {
    console.error('getMonthSummary error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/master-attendance/day
// Drill-down for a single date
exports.getDayDetail = async (req, res) => {
  const { date, department, yearOfStudy, section } = req.query;

  if (!date || !department || !yearOfStudy || !section) {
    return res.status(400).json({ message: 'Specify date, department, yearOfStudy, and section.' });
  }

  try {
    const students = await Student.find({
      department,
      year: Number(yearOfStudy),
      section
    }).sort({ registerNumber: 1 });

    const attendanceRecords = await Attendance.find({ date });

    const result = students.map(student => {
      const periodMap = {};
      for (let p = 1; p <= 7; p++) periodMap[p] = '-';

      attendanceRecords
        .filter(r => r.studentRegisterNumber === student.registerNumber)
        .forEach(r => { periodMap[r.period] = r.status; });

      // Calculate present percentage for marked periods
      const markedPeriods = Object.values(periodMap).filter(v => v !== '-');
      const presentCount = markedPeriods.filter(v => ['Present', 'OD'].includes(v)).length;
      const percentage = markedPeriods.length > 0
        ? Math.round((presentCount / markedPeriods.length) * 100)
        : null;

      return {
        _id: student._id,
        registerNumber: student.registerNumber,
        name: student.name,
        email: student.email,
        phone: student.phone,
        photo: student.photo,
        attendance: periodMap,
        percentage
      };
    });

    const summary = {
      totalStudents: result.length,
      periodsMarked: [1,2,3,4,5,6,7].filter(p =>
        result.some(s => s.attendance[p] !== '-')
      )
    };

    res.json({ date, department, yearOfStudy: Number(yearOfStudy), section, students: result, summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
