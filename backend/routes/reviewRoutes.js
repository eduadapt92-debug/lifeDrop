const express = require('express');
const router  = express.Router();
const {
  getReviews,
  getMyReview,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.get('/',          getReviews);
router.get('/my',        protect, getMyReview);
router.post('/',         protect, createReview);
router.put('/:id',       protect, updateReview);
router.delete('/:id',    protect, deleteReview);
router.put('/:id/helpful', protect, markHelpful);

module.exports = router;
