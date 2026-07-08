const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema(
  {
    studentRegisterNumber: {
      type: String,
      required: true,
      ref: 'Student',
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    timetableDay: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    period: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    subject: {
      type: String,
      required: true,
    },
    teacherId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Present', 'Absent', 'OD'],
      default: 'Present',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    correctionAllowed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance for a student on the same date and period
attendanceSchema.index({ studentRegisterNumber: 1, date: 1, period: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
