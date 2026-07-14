const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance'); // ← CRITICAL FIX: was missing
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All routes protected + admin only
router.use(protect);
router.use(adminOnly);

/* ================================================================
   TEACHER (STAFF) CRUD
   ================================================================ */

router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({}).select('-password').sort({ teacherId: 1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/teachers', async (req, res) => {
  const { teacherId, name, email, password, department, assignedSubjects, role } = req.body;
  if (!teacherId || !name || !email || !password || !department) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }
  try {
    if (await Teacher.findOne({ teacherId })) return res.status(400).json({ message: 'Teacher ID already exists.' });
    if (await Teacher.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'Email already exists.' });

    const teacher = await new Teacher({
      teacherId, name, email: email.toLowerCase(),
      password, department,
      assignedSubjects: assignedSubjects || [],
      role: role || 'faculty'
    }).save();

    const obj = teacher.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/teachers/:id', async (req, res) => {
  const { name, email, password, department, assignedSubjects, role } = req.body;
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

    if (email && email !== teacher.email) {
      if (await Teacher.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } })) {
        return res.status(400).json({ message: 'Email already in use.' });
      }
      teacher.email = email.toLowerCase();
    }

    teacher.name = name || teacher.name;
    teacher.department = department || teacher.department;
    if (assignedSubjects !== undefined) teacher.assignedSubjects = assignedSubjects;
    teacher.role = role || teacher.role;
    if (password) teacher.password = password;

    const saved = await teacher.save();
    const obj = saved.toObject();
    delete obj.password;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    if (teacher.teacherId === 'admin') return res.status(400).json({ message: 'Cannot delete master admin.' });
    await Teacher.deleteOne({ _id: req.params.id });
    res.json({ message: 'Teacher removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================================================================
   STUDENT CRUD
   ================================================================ */

router.get('/students', async (req, res) => {
  try {
    const { department, year, section, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    if (section) filter.section = section;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const students = await Student.find(filter).sort({ registerNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/students', async (req, res) => {
  const { registerNumber, name, department, year, section } = req.body;
  if (!registerNumber || !name || !department || !year || !section) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }
  try {
    if (await Student.findOne({ registerNumber })) {
      return res.status(400).json({ message: 'Register Number already exists.' });
    }
    const student = await new Student({ registerNumber, name, department, year: Number(year), section }).save();
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/students/bulk', async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Invalid data format. Expected an array of students.' });
    }

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (!s.registerNumber || !s.name || !s.department || !s.year || !s.section) {
        errors.push(`Row ${i + 1}: Missing required fields for ${s.name || 'Unknown'}`);
        continue;
      }

      let existing = await Student.findOne({ registerNumber: s.registerNumber });
      if (existing) {
        existing.name = s.name;
        existing.department = s.department;
        existing.year = Number(s.year);
        existing.section = s.section;
        if (s.email) existing.email = s.email;
        if (s.phone) existing.phone = s.phone;
        await existing.save();
        updated++;
      } else {
        const newStudent = new Student({
          registerNumber: s.registerNumber,
          name: s.name,
          department: s.department,
          year: Number(s.year),
          section: s.section,
          email: s.email || '',
          phone: s.phone || '',
          password: s.registerNumber // Default password
        });
        await newStudent.save();
        inserted++;
      }
    }

    res.status(201).json({
      message: `Bulk operation completed. Inserted: ${inserted}, Updated: ${updated}.`,
      inserted,
      updated,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/students/:id', async (req, res) => {
  const { name, registerNumber, department, year, section } = req.body;
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    if (registerNumber && registerNumber !== student.registerNumber) {
      if (await Student.findOne({ registerNumber, _id: { $ne: req.params.id } })) {
        return res.status(400).json({ message: 'Register Number already in use.' });
      }
      student.registerNumber = registerNumber;
    }
    student.name = name || student.name;
    student.department = department || student.department;
    if (year !== undefined) student.year = Number(year);
    student.section = section || student.section;

    res.json(await student.save());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    await Student.deleteOne({ _id: req.params.id });
    res.json({ message: 'Student removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});/* ================================================================
   MASTER & DASHBOARD ENDPOINTS
   ================================================================ */
const adminController = require('../controllers/adminController');

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/master-attendance', adminController.getDayDetail); // fallback to keep original working
router.get('/master-attendance/month', adminController.getMonthSummary);
router.get('/master-attendance/day', adminController.getDayDetail);

module.exports = router;
