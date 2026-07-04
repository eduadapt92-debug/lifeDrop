const RecipientProfile = require('../models/RecipientProfile');
const BloodRequest = require('../models/BloodRequest');

const getRecipientProfile = async (req, res) => {
  try {
    const profile = await RecipientProfile.findOne({ user: req.user._id }).populate('user', 'name email phone');
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRecipientProfile = async (req, res) => {
  try {
    const profile = await RecipientProfile.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const requestBlood = async (req, res) => {
  try {
    const profile = await RecipientProfile.findOne({ user: req.user._id });
    const request = await BloodRequest.create({
      requestedBy: req.user._id,
      requesterRole: 'recipient',
      recipient: profile?._id,
      ...req.body,
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecipientProfile, updateRecipientProfile, requestBlood };
