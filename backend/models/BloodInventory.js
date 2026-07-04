const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
  },
  availableUnits: { type: Number, default: 0 },
  usedUnits: { type: Number, default: 0 },
  expiredUnits: { type: Number, default: 0 },
  expiryDate: Date,
  storageLocation: String,
  status: {
    type: String,
    enum: ['critical', 'low', 'moderate', 'stable', 'optimal'],
    default: 'stable',
  },
}, { timestamps: true });

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);
