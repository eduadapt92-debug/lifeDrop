const DonorProfile = require('../models/DonorProfile');
const DonationRecord = require('../models/DonationRecord');
const User = require('../models/User');

// @desc   Get all eligible donors
// @route  GET /api/donors/eligible
const getEligibleDonors = async (req, res) => {
  try {
    const donors = await DonorProfile.find({ eligibilityStatus: true, availabilityStatus: true })
      .populate('user', 'name email phone')
      .sort('-updatedAt');
    res.json(donors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get nearby donors
// @route  GET /api/donors/nearby
const getNearbyDonors = async (req, res) => {
  try {
    const { city, bloodGroup } = req.query;
    const query = { eligibilityStatus: true };
    if (city) query.city = new RegExp(city, 'i');
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const donors = await DonorProfile.find(query)
      .populate('user', 'name email phone')
      .limit(10);
    res.json(donors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get all donors
// @route  GET /api/donors
const getDonors = async (req, res) => {
  try {
    const donors = await DonorProfile.find()
      .populate('user', 'name email phone status')
      .sort('-createdAt');
    res.json(donors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get donor by ID
// @route  GET /api/donors/:id
const getDonorById = async (req, res) => {
  try {
    const donor = await DonorProfile.findById(req.params.id).populate('user', 'name email phone');
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json(donor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update donor profile
// @route  PUT /api/donors/profile
const updateDonorProfile = async (req, res) => {
  try {
    const profile = await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Upload health document
// @route  POST /api/donors/upload-document
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;

    await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      { $push: { healthDocuments: fileUrl } }
    );
    res.json({ message: 'Document uploaded', fileUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get donor history
// @route  GET /api/donors/history
const getDonorHistory = async (req, res) => {
  try {
    const records = await DonationRecord.find({ donor: req.user._id })
      .populate('hospital', 'hospitalName city')
      .sort('-donationDate');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get donor profile (own)
// @route  GET /api/donors/profile
const getDonorProfile = async (req, res) => {
  try {
    const profile = await DonorProfile.findOne({ user: req.user._id }).populate('user', 'name email phone');
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDonors,
  getEligibleDonors,
  getNearbyDonors,
  getDonorById,
  updateDonorProfile,
  uploadDocument,
  getDonorHistory,
  getDonorProfile,
};
