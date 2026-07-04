const User = require('../models/User');
const HospitalProfile = require('../models/HospitalProfile');
const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

// @desc   Get admin stats
const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers, totalDonors, totalRecipients, totalHospitals,
      activeRequests, emergencyRequests, pendingHospitals
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'recipient' }),
      User.countDocuments({ role: 'hospital' }),
      BloodRequest.countDocuments({ status: { $in: ['open', 'matched', 'accepted'] } }),
      BloodRequest.countDocuments({ urgencyLevel: 'critical', status: { $ne: 'fulfilled' } }),
      HospitalProfile.countDocuments({ verificationStatus: 'pending' }),
    ]);

    res.json({
      totalUsers, totalDonors, totalRecipients, totalHospitals,
      activeRequests, emergencyRequests, pendingHospitals,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get pending hospitals
const getPendingHospitals = async (req, res) => {
  try {
    const hospitals = await HospitalProfile.find({ verificationStatus: 'pending' })
      .populate('user', 'name email phone createdAt');
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Verify/reject hospital
const verifyHospital = async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'rejected'
    const hospital = await HospitalProfile.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: status },
      { new: true }
    ).populate('user');

    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    // Notify hospital
    await Notification.create({
      user: hospital.user._id,
      title: status === 'verified' ? '✅ Hospital Verified' : '❌ Hospital Rejected',
      message: status === 'verified'
        ? 'Your hospital has been verified. You can now access full platform features.'
        : 'Your hospital verification was rejected. Please contact support.',
      type: 'system',
    });

    const io = req.app.get('io');
    if (io) io.to(hospital.user._id.toString()).emit('hospital_verified', { status });

    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get audit logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort('-createdAt')
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdminStats, getUsers, updateUserStatus, getPendingHospitals, verifyHospital, getAuditLogs };
