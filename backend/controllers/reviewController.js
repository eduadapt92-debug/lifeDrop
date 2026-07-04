const Review = require('../models/Review');

// GET /api/reviews — public, paginated
exports.getReviews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const rating = req.query.rating ? parseInt(req.query.rating) : null;
    const sort   = req.query.sort   || '-createdAt';

    const filter = rating ? { rating } : {};

    const [reviews, total, statsAgg, avgAgg] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name role')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments(filter),
      Review.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);

    const totalAll = await Review.countDocuments();
    const average  = avgAgg.length ? Math.round(avgAgg[0].avg * 10) / 10 : 0;
    const breakdown = [5, 4, 3, 2, 1].map(r => {
      const found = statsAgg.find(s => s._id === r);
      return { rating: r, count: found ? found.count : 0 };
    });

    res.json({
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
      average,
      breakdown,
      totalAll,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/my — current user's review
exports.getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({ user: req.user._id }).populate('user', 'name role');
    res.json(review || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reviews — authenticated
exports.createReview = async (req, res) => {
  try {
    const { rating, title, body } = req.body;
    if (!rating || !title || !body)
      return res.status(400).json({ message: 'Rating, title, and review body are required.' });

    const existing = await Review.findOne({ user: req.user._id });
    if (existing)
      return res.status(400).json({ message: 'You have already submitted a review. Delete your existing review to submit a new one.' });

    const review = await Review.create({ user: req.user._id, rating, title, body });
    await review.populate('user', 'name role');
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'You have already submitted a review.' });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/reviews/:id — owner only
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    if (review.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to edit this review.' });

    const { rating, title, body } = req.body;
    if (rating) review.rating = rating;
    if (title)  review.title  = title;
    if (body)   review.body   = body;
    await review.save();
    await review.populate('user', 'name role');
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reviews/:id — owner or admin
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: 'Not authorized to delete this review.' });

    await review.deleteOne();
    res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/reviews/:id/helpful — toggle helpful vote
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const userId    = req.user._id.toString();
    const alreadyVoted = review.votedBy.map(v => v.toString()).includes(userId);

    if (alreadyVoted) {
      review.votedBy.pull(req.user._id);
      review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
    } else {
      review.votedBy.push(req.user._id);
      review.helpfulVotes += 1;
    }

    await review.save();
    res.json({ helpfulVotes: review.helpfulVotes, voted: !alreadyVoted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
