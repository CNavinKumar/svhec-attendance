const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');

// Consolidated API to fetch diverse categories of reports
exports.generateReport = async (req, res) => {
  const { 
    type, // 'daily' | 'weekly' | 'monthly' | 'semester' | 'annual' | 'student' | 'faculty' | 'department' | 'subject' | 'hour' | 'defaulters' | 'low-attendance'
    department, 
    year, 
    section, 
    date, 
    from, 
    to, 
    month, 
    year_filter,
    semester,
    subject,
    faculty,
    studentReg,
    threshold = 75
  } = req.query;

  try {
    const filter = {};
    if (department) filter.department = department;
    if (year)       filter.year = Number(year);
    if (section)    filter.section = section;

    // Build date bounds
    const dateFilter = {};
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.$gte = from;
      if (to)   dateFilter.date.$lte = to;
    } else if (date) {
      dateFilter.date = date;
    } else if (month && year_filter) {
      dateFilter.date = { $regex: `^${year_filter}-${String(month).padStart(2, '0')}` };
    }

    if (type === 'daily') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const students = await Student.find(filter).sort({ registerNumber: 1 });
      const records = await Attendance.find({ date: targetDate });
      
      const studentsReport = students.map(s => {
        const pMap = {};
        for (let i = 1; i <= 7; i++) pMap[i] = '-';
        const sRecs = records.filter(r => r.studentRegisterNumber === s.registerNumber);
        sRecs.forEach(r => { pMap[r.period] = r.status; });

        const marked = Object.values(pMap).filter(v => v !== '-');
        const present = marked.filter(v => ['Present', 'OD', 'Late'].includes(v)).length;
        const percentage = marked.length > 0 ? Math.round((present / marked.length) * 100) : null;

        return {
          registerNumber: s.registerNumber,
          name: s.name,
          department: s.department,
          year: s.year,
          section: s.section,
          periods: pMap,
          periodsPresent: present,
          periodsTotal: marked.length,
          percentage
        };
      });

      return res.json({ type: 'daily', date: targetDate, students: studentsReport });
    }

    if (type === 'defaulters' || type === 'low-attendance') {
      const students = await Student.find(filter).sort({ registerNumber: 1 });
      const allRecords = await Attendance.find(dateFilter);

      const report = students.map(s => {
        const recs = allRecords.filter(r => r.studentRegisterNumber === s.registerNumber);
        const total = recs.length;
        const present = recs.filter(r => ['Present', 'OD', 'Late'].includes(r.status)).length;
        const absent = total - present;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          registerNumber: s.registerNumber,
          name: s.name,
          department: s.department,
          year: s.year,
          section: s.section,
          total,
          present,
          absent,
          percentage
        };
      }).filter(s => s.total > 0 && s.percentage < Number(threshold));

      return res.json({ type, threshold: Number(threshold), defaulters: report });
    }

    if (type === 'faculty') {
      const teachers = await Teacher.find({}).select('-password');
      const allRecords = await Attendance.find(dateFilter);

      const report = teachers.map(t => {
        const tRecs = allRecords.filter(r => r.teacherId === t.teacherId);
        const periodsConducted = [...new Set(tRecs.map(r => `${r.date}-${r.period}`))].length;
        const present = tRecs.filter(r => ['Present', 'OD', 'Late'].includes(r.status)).length;
        const total = tRecs.length;
        const avgAttendance = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          facultyName: t.name,
          teacherId: t.teacherId,
          department: t.department,
          assignedSubjects: t.assignedSubjects,
          periodsConducted,
          avgAttendance: total > 0 ? `${avgAttendance}%` : 'N/A'
        };
      });

      return res.json({ type: 'faculty', report });
    }

    if (type === 'subject') {
      const records = await Attendance.find(dateFilter);
      const subjectMap = {};

      records.forEach(r => {
        if (!subjectMap[r.subject]) {
          subjectMap[r.subject] = { subject: r.subject, total: 0, present: 0, teacherIds: new Set() };
        }
        subjectMap[r.subject].total++;
        if (['Present', 'OD', 'Late'].includes(r.status)) {
          subjectMap[r.subject].present++;
        }
        subjectMap[r.subject].teacherIds.add(r.teacherId);
      });

      const report = Object.values(subjectMap).map(sub => {
        return {
          subject: sub.subject,
          teachers: [...sub.teacherIds].join(', '),
          totalRecords: sub.total,
          avgAttendance: sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0
        };
      });

      return res.json({ type: 'subject', report });
    }

    if (type === 'hour') {
      const records = await Attendance.find(dateFilter);
      const hourMap = {};
      for (let h = 1; h <= 7; h++) {
        hourMap[h] = { period: h, total: 0, present: 0 };
      }

      records.forEach(r => {
        if (hourMap[r.period]) {
          hourMap[r.period].total++;
          if (['Present', 'OD', 'Late'].includes(r.status)) {
            hourMap[r.period].present++;
          }
        }
      });

      const report = Object.values(hourMap).map(h => ({
        period: h.period,
        totalRecords: h.total,
        avgAttendance: h.total > 0 ? Math.round((h.present / h.total) * 100) : 0
      }));

      return res.json({ type: 'hour', report });
    }

    // Default student report (history)
    if (type === 'student' && studentReg) {
      const student = await Student.findOne({ registerNumber: studentReg });
      if (!student) return res.status(404).json({ message: 'Student not found.' });

      const records = await Attendance.find({ studentRegisterNumber: studentReg, ...dateFilter }).sort({ date: -1, period: 1 });
      const total = records.length;
      const present = records.filter(r => ['Present', 'OD', 'Late'].includes(r.status)).length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return res.json({
        type: 'student',
        student,
        summary: { total, present, absent: total - present, percentage },
        history: records
      });
    }

    res.status(400).json({ message: 'Invalid report type or missing parameters.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
