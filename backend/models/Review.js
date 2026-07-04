const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  body: { type: String, required: true, trim: true, maxlength: 1000 },
  helpfulVotes: { type: Number, default: 0 },
  votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// Enforce one review per user
reviewSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
