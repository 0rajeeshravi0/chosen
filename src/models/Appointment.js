const mongoose = require('mongoose');

const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

/**
 * Appointment Status Transition Rules:
 *
 *   scheduled  → confirmed, cancelled
 *   confirmed  → completed, cancelled, no_show
 *   completed  → (terminal)
 *   cancelled  → (terminal)
 *   no_show    → (terminal)
 */
const VALID_TRANSITIONS = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
    },
    appointmentDate: {
      type: String,
      required: [true, 'Appointment date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
module.exports.STATUSES = STATUSES;
