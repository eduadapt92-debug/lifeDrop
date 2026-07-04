const mongoose = require('mongoose');

const bloodBankProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodBankName: { type: String, required: true },
  city: String,
  address: String,
  registrationNumber: String,
  authorizationDocument: String,
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('BloodBankProfile', bloodBankProfileSchema);
