const mongoose = require('mongoose');

const healthDocumentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String, enum: ['health_certificate', 'medical_report', 'authorization', 'id_proof'] },
  fileUrl: { type: String, required: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('HealthDocument', healthDocumentSchema);
