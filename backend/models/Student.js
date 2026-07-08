const mongoose = require('mongoose');

const studentSchema = mongoose.Schema(
  {
    registerNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
      default: 'IT',
    },
    year: {
      type: Number,
      required: true,
      default: 4,
    },
    section: {
      type: String,
      required: true,
      default: 'A',
    },
  },
  {
    timestamps: true,
  }
);

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
