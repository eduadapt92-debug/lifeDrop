const HospitalProfile = require('../models/HospitalProfile');
const BloodInventory = require('../models/BloodInventory');
const { matchDonors } = require('../utils/matchDonors');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc   Get all hospitals
const getHospitals = async (req, res) => {
  try {
    const hospitals = await HospitalProfile.find({ verificationStatus: 'verified' })
      .populate('user', 'name email phone');
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get hospital by ID
const getHospitalById = async (req, res) => {
  try {
    const hospital = await HospitalProfile.findById(req.params.id).populate('user', 'name email phone');
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update hospital profile
const updateHospitalProfile = async (req, res) => {
  try {
    const profile = await HospitalProfile.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get matched donors for hospital
const getMatchedDonors = async (req, res) => {
  try {
    const { bloodGroup, city, area, urgencyLevel } = req.query;
    const donorIds = await matchDonors({ bloodGroupNeeded: bloodGroup, city, area, urgencyLevel });
    const donors = await User.find({ _id: { $in: donorIds } }).select('name email phone');
    res.json(donors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get hospital profile (own)
const getHospitalProfile = async (req, res) => {
  try {
    const profile = await HospitalProfile.findOne({ user: req.user._id }).populate('user', 'name email phone');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Notify a donor
const notifyDonor = async (req, res) => {
  try {
    const { donorId, message, bloodGroup } = req.body;
    const hospital = await HospitalProfile.findOne({ user: req.user._id });

    const notification = await Notification.create({
      user: donorId,
      title: '🏥 Hospital Blood Request',
      message: message || `${hospital?.hospitalName || 'A hospital'} needs ${bloodGroup} blood urgently.`,
      type: 'emergency',
    });

    const io = req.app.get('io');
    if (io) io.to(donorId).emit('donor_matched', { notification });

    res.json({ message: 'Donor notified', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHospitals, getHospitalById, updateHospitalProfile, getMatchedDonors, getHospitalProfile, notifyDonor };
