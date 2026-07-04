const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  label:     { type: String, required: true, trim: true, maxlength: 30 },
  message:   { type: String, required: true, trim: true, maxlength: 200 },
  type:      { type: String, enum: ['critical','urgent','low','info','announcement'], default: 'info' },
  isActive:  { type: Boolean, default: true },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
