const mongoose = require('mongoose');

const recipientProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  requiredBloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  city: String,
  area: String,
  hospitalName: String,
  urgencyLevel: { type: String, enum: ['critical', 'urgent', 'scheduled'], default: 'urgent' },
  medicalNote: String,
  medicalDocuments: [String],
}, { timestamps: true });

module.exports = mongoose.model('RecipientProfile', recipientProfileSchema);
