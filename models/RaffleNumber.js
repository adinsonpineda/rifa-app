const mongoose = require('mongoose');

const raffleNumberSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    taken: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    takenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RaffleNumber', raffleNumberSchema);
