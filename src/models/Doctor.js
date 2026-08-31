const mongoose = require('mongoose');

const timeBlockSchema = new mongoose.Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    specialisation: {
      type: String,
      required: [true, 'Specialisation is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    workingHours: {
      monday: [timeBlockSchema],
      tuesday: [timeBlockSchema],
      wednesday: [timeBlockSchema],
      thursday: [timeBlockSchema],
      friday: [timeBlockSchema],
      saturday: [timeBlockSchema],
      sunday: [timeBlockSchema],
    },
  },
  { timestamps: true }
);

doctorSchema.index({ email: 1 }, { unique: true });
doctorSchema.index({ phone: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
