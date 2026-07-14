const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    password: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    photo: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80' // default premium avatar
    },
    role: {
      type: String,
      required: true,
      default: 'student'
    }
  },
  {
    timestamps: true,
  }
);

studentSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

studentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
