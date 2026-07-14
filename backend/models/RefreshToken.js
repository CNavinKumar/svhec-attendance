const mongoose = require('mongoose');

const refreshTokenSchema = mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: String, // teacherId or registerNumber
      required: true
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Teacher', 'Student']
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create an index to auto-delete expired documents
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
