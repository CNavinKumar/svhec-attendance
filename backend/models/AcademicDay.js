const mongoose = require('mongoose');

const academicDaySchema = mongoose.Schema(
  {
    date: {
      type: String, // format YYYY-MM-DD
      required: true,
      unique: true,
      trim: true,
    },
    dayNumber: {
      type: Number, // 1 to 10. null if holiday.
      default: null,
    },
    isHoliday: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const AcademicDay = mongoose.model('AcademicDay', academicDaySchema);
module.exports = AcademicDay;
