const mongoose = require('mongoose');

const donationRecordSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
  bloodGroup: String,
  donationType: { type: String, enum: ['whole_blood', 'plasma', 'platelets', 'double_red'], default: 'whole_blood' },
  donationDate: { type: Date, required: true },
  unitsDonated: { type: Number, default: 1 },
  certificateUrl: String,
  status: { type: String, enum: ['completed', 'pending', 'cancelled'], default: 'completed' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('DonationRecord', donationRecordSchema);
