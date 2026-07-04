const mongoose = require('mongoose');

const donorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: Date,
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
  },
  city: String,
  area: String,
  weight: Number,
  lastDonationDate: Date,
  healthStatus: { type: String, enum: ['healthy', 'under_treatment', 'temporary_deferral'], default: 'healthy' },
  eligibilityStatus: { type: Boolean, default: true },
  availabilityStatus: { type: Boolean, default: true },
  healthDocuments: [String],
  donationCount: { type: Number, default: 0 },
  donorTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  points: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DonorProfile', donorProfileSchema);
