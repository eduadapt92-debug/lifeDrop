const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterRole: { type: String, enum: ['recipient', 'hospital', 'bloodbank'] },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'RecipientProfile' },
  bloodGroupNeeded: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
  },
  quantityNeeded: { type: Number, required: true },
  urgencyLevel: { type: String, enum: ['critical', 'urgent', 'scheduled'], default: 'urgent' },
  city: String,
  area: String,
  reason: String,
  status: {
    type: String,
    enum: ['open', 'matched', 'accepted', 'fulfilled', 'cancelled'],
    default: 'open',
  },
  matchedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  acceptedDonor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
