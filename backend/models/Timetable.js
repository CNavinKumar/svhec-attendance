const mongoose = require('mongoose');

const timetableSchema = mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    periodNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    subjectAcronym: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    teacherId: {
      type: String,
      required: true,
      trim: true,
    },
    classroom: {
      type: String,
      default: 'LH-101',
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index to prevent duplicate assignments for a given day and period
timetableSchema.index({ dayNumber: 1, periodNumber: 1 }, { unique: true });

const Timetable = mongoose.model('Timetable', timetableSchema);
module.exports = Timetable;
