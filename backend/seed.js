const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Timetable = require('./models/Timetable');
const AcademicDay = require('./models/AcademicDay');

dotenv.config();

const teachersData = [
  {
    teacherId: 'T01',
    name: 'Ms.S.CHITRA',
    email: 'chitra@college.edu',
    password: 'password123',
    department: 'IT',
    assignedSubjects: ['UHV2', 'SPORTS', 'COUN'],
    role: 'faculty'
  },
  {
    teacherId: 'T02',
    name: 'Ms.P.PRABHA',
    email: 'prabha@college.edu',
    password: 'password123',
    department: 'IT',
    assignedSubjects: ['POM'],
    role: 'faculty'
  },
  {
    teacherId: 'T03',
    name: 'Ms.M.PRADEEPA',
    email: 'pradeepa@college.edu',
    password: 'password123',
    department: 'EEE',
    assignedSubjects: ['RES'],
    role: 'faculty'
  },
  {
    teacherId: 'T04',
    name: 'Mr.A.KATHIRVEL',
    email: 'kathirvel@college.edu',
    password: 'password123',
    department: 'BME',
    assignedSubjects: ['IOT'],
    role: 'faculty'
  },
  {
    teacherId: 'T05',
    name: 'Ms.K.GAYATHIRI',
    email: 'gayathiri@college.edu',
    password: 'password123',
    department: 'ECE',
    assignedSubjects: ['WOC'],
    role: 'faculty'
  },
  {
    teacherId: 'T06',
    name: 'Mr.V.DEEPAN',
    email: 'deepan@college.edu',
    password: 'password123',
    department: 'PT',
    assignedSubjects: ['IAT(CC5)'],
    role: 'faculty'
  },
  {
    teacherId: 'T07',
    name: 'Mr.MEGANATHAN',
    email: 'meganathan@college.edu',
    password: 'password123',
    department: 'PT',
    assignedSubjects: ['COMM'],
    role: 'faculty'
  },
  {
    teacherId: 'T08',
    name: 'Ms.M.DHIVYA',
    email: 'dhivya@college.edu',
    password: 'password123',
    department: 'CS',
    assignedSubjects: ['LIB'],
    role: 'faculty'
  },
  {
    teacherId: 'T09',
    name: 'Mr.K.VIGNESH',
    email: 'vignesh@college.edu',
    password: 'password123',
    department: 'IT',
    assignedSubjects: ['SPORTS'],
    role: 'faculty'
  },
  {
    teacherId: 'admin',
    name: 'Administrator',
    email: 'admin@college.edu',
    password: 'adminpassword',
    department: 'IT',
    assignedSubjects: [],
    role: 'admin'
  }
];

const studentsData = [
  { registerNumber: '2023IT001', name: 'Abishek A', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT002', name: 'Balaji S', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT003', name: 'Chitra R', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT004', name: 'Deepak K', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT005', name: 'Eshwari M', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT006', name: 'Hariharan P', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT007', name: 'Indhu J', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT008', name: 'Jeeva V', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT009', name: 'Karthik S', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT010', name: 'Logesh N', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT011', name: 'Manoj K', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT012', name: 'Naveen S', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT013', name: 'Priya D', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT014', name: 'Ramya M', department: 'IT', year: 4, section: 'A' },
  { registerNumber: '2023IT015', name: 'Suresh K', department: 'IT', year: 4, section: 'A' }
];

// Timetable subject names mapping
const subjectNames = {
  'UHV2': 'UNIVERSAL HUMAN VALUES -2',
  'POM': 'PRINCIPLES OF MANAGEMENT',
  'RES': 'RENEWABLE ENERGY SOURCES',
  'IOT': 'IOT IN HEALTHCARE',
  'WOC': 'WIRELESS OPTICAL COMMUNICATION',
  'IAT(CC5)': 'INTERNAL APTITUDE TRAINING',
  'COMM': 'ENGLISH COMMUNICATION',
  'LIB': 'LIBRARY',
  'SPORTS': 'SPORTS',
  'COUN': 'COUNSELLING'
};

// Seeding 10-day timetable
const timetableData = [
  // Day 1
  { dayNumber: 1, periodNumber: 1, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 1, periodNumber: 2, subjectAcronym: 'RES', teacherId: 'T03' },
  { dayNumber: 1, periodNumber: 3, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 1, periodNumber: 4, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 1, periodNumber: 5, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 1, periodNumber: 6, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 1, periodNumber: 7, subjectAcronym: 'RES', teacherId: 'T03' },

  // Day 2
  { dayNumber: 2, periodNumber: 1, subjectAcronym: 'RES', teacherId: 'T03' },
  { dayNumber: 2, periodNumber: 2, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 2, periodNumber: 3, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 2, periodNumber: 4, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 2, periodNumber: 5, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 2, periodNumber: 6, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 2, periodNumber: 7, subjectAcronym: 'RES', teacherId: 'T03' },

  // Day 3
  { dayNumber: 3, periodNumber: 1, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 3, periodNumber: 2, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 3, periodNumber: 3, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 3, periodNumber: 4, subjectAcronym: 'IAT(CC5)', teacherId: 'T06' },
  { dayNumber: 3, periodNumber: 5, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 3, periodNumber: 6, subjectAcronym: 'LIB', teacherId: 'T08' },
  { dayNumber: 3, periodNumber: 7, subjectAcronym: 'IOT', teacherId: 'T04' },

  // Day 4
  { dayNumber: 4, periodNumber: 1, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 4, periodNumber: 2, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 4, periodNumber: 3, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 4, periodNumber: 4, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 4, periodNumber: 5, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 4, periodNumber: 6, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 4, periodNumber: 7, subjectAcronym: 'SPORTS', teacherId: 'T09' },

  // Day 5
  { dayNumber: 5, periodNumber: 1, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 5, periodNumber: 2, subjectAcronym: 'RES', teacherId: 'T03' },
  { dayNumber: 5, periodNumber: 3, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 5, periodNumber: 4, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 5, periodNumber: 5, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 5, periodNumber: 6, subjectAcronym: 'COMM', teacherId: 'T07' },
  { dayNumber: 5, periodNumber: 7, subjectAcronym: 'COUN', teacherId: 'T01' },

  // Day 6
  { dayNumber: 6, periodNumber: 1, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 6, periodNumber: 2, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 6, periodNumber: 3, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 6, periodNumber: 4, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 6, periodNumber: 5, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 6, periodNumber: 6, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 6, periodNumber: 7, subjectAcronym: 'RES', teacherId: 'T03' },

  // Day 7
  { dayNumber: 7, periodNumber: 1, subjectAcronym: 'RES', teacherId: 'T03' },
  { dayNumber: 7, periodNumber: 2, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 7, periodNumber: 3, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 7, periodNumber: 4, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 7, periodNumber: 5, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 7, periodNumber: 6, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 7, periodNumber: 7, subjectAcronym: 'RES', teacherId: 'T03' },

  // Day 8
  { dayNumber: 8, periodNumber: 1, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 8, periodNumber: 2, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 8, periodNumber: 3, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 8, periodNumber: 4, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 8, periodNumber: 5, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 8, periodNumber: 6, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 8, periodNumber: 7, subjectAcronym: 'RES', teacherId: 'T03' },

  // Day 9
  { dayNumber: 9, periodNumber: 1, subjectAcronym: 'POM', teacherId: 'T02' },
  { dayNumber: 9, periodNumber: 2, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 9, periodNumber: 3, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 9, periodNumber: 4, subjectAcronym: 'IAT(CC5)', teacherId: 'T06' },
  { dayNumber: 9, periodNumber: 5, subjectAcronym: 'COMM', teacherId: 'T07' },
  { dayNumber: 9, periodNumber: 6, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 9, periodNumber: 7, subjectAcronym: 'POM', teacherId: 'T02' },

  // Day 10
  { dayNumber: 10, periodNumber: 1, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 10, periodNumber: 2, subjectAcronym: 'RES', teacherId: 'T03' },
  { dayNumber: 10, periodNumber: 3, subjectAcronym: 'UHV2', teacherId: 'T01' },
  { dayNumber: 10, periodNumber: 4, subjectAcronym: 'WOC', teacherId: 'T05' },
  { dayNumber: 10, periodNumber: 5, subjectAcronym: 'IOT', teacherId: 'T04' },
  { dayNumber: 10, periodNumber: 6, subjectAcronym: 'RES', teacherId: 'T03' },
  { dayNumber: 10, periodNumber: 7, subjectAcronym: 'UHV2', teacherId: 'T01' }
];

// Helper to format Date to YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

// Generate Academic Days starting from July 2, 2026 (Day 1)
const generateAcademicDays = () => {
  const academicDays = [];
  const startDate = new Date('2026-07-02');
  const endDate = new Date('2026-08-31');
  
  let currentDayNum = 1;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend by default
      academicDays.push({
        date: dateStr,
        dayNumber: null,
        isHoliday: true,
        description: dayOfWeek === 0 ? 'Sunday' : 'Saturday'
      });
    } else {
      // Weekday
      academicDays.push({
        date: dateStr,
        dayNumber: currentDayNum,
        isHoliday: false,
        description: `Day ${currentDayNum}`
      });
      // Increment and wrap dayNumber (1-10)
      currentDayNum = currentDayNum === 10 ? 1 : currentDayNum + 1;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return academicDays;
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance_system');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Teacher.deleteMany();
    await Student.deleteMany();
    await Timetable.deleteMany();
    await AcademicDay.deleteMany();
    console.log('Cleared existing collections.');

    // Seed Teachers
    // Need to trigger password hashing pre-save, so we use Teacher.create
    await Teacher.create(teachersData);
    console.log('Seeded Teachers.');

    // Seed Students
    await Student.insertMany(studentsData);
    console.log('Seeded Students.');

    // Map subjectName inside Timetable objects
    const timetableWithNames = timetableData.map(slot => ({
      ...slot,
      subjectName: subjectNames[slot.subjectAcronym] || 'Other Activity'
    }));
    await Timetable.insertMany(timetableWithNames);
    console.log('Seeded Timetable.');

    // Seed Academic Days
    const academicDays = generateAcademicDays();
    await AcademicDay.insertMany(academicDays);
    console.log(`Seeded ${academicDays.length} Academic Days (from 2026-07-02 to 2026-08-31).`);

    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
