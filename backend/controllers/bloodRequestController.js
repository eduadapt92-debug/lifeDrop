const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const { matchDonors } = require('../utils/matchDonors');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

// @desc   Create blood request
// @route  POST /api/blood-requests
const createBloodRequest = async (req, res) => {
  try {
    const { bloodGroupNeeded, quantityNeeded, urgencyLevel, city, area, reason, hospital } = req.body;

    const request = await BloodRequest.create({
      requestedBy: req.user._id,
      requesterRole: req.user.role,
      bloodGroupNeeded,
      quantityNeeded,
      urgencyLevel,
      city,
      area,
      reason,
      hospital,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    // Find matching donors
    const matchedDonorIds = await matchDonors({ bloodGroupNeeded, city, area, urgencyLevel });
    request.matchedDonors = matchedDonorIds;
    request.status = matchedDonorIds.length > 0 ? 'matched' : 'open';
    await request.save();

    // Send notifications to matched donors
    const io = req.app.get('io');
    for (const donorId of matchedDonorIds) {
      const notification = await Notification.create({
        user: donorId,
        title: urgencyLevel === 'critical' ? '🚨 Critical Blood Request!' : '🩸 Blood Request Match',
        message: `${bloodGroupNeeded} blood needed in ${city}. Quantity: ${quantityNeeded} units. Urgency: ${urgencyLevel}.`,
        type: urgencyLevel === 'critical' ? 'emergency' : 'match',
        link: `/blood-request.html?id=${request._id}`,
      });

      if (io) {
        io.to(donorId.toString()).emit('donor_matched', {
          requestId: request._id,
          bloodGroup: bloodGroupNeeded,
          city,
          urgencyLevel,
          notification,
        });
      }
    }

    // Emit emergency event
    if (urgencyLevel === 'critical' && io) {
      io.emit('emergency_request_created', {
        requestId: request._id,
        bloodGroup: bloodGroupNeeded,
        city,
        hospital,
      });
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get all blood requests
// @route  GET /api/blood-requests
const getBloodRequests = async (req, res) => {
  try {
    const { status, urgencyLevel, bloodGroup, city } = req.query;
    const query = {};
    if (status) query.status = status;
    if (urgencyLevel) query.urgencyLevel = urgencyLevel;
    if (bloodGroup) query.bloodGroupNeeded = bloodGroup;
    if (city) query.city = new RegExp(city, 'i');

    const requests = await BloodRequest.find(query)
      .populate('requestedBy', 'name email role')
      .populate('hospital', 'hospitalName city')
      .sort('-createdAt');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get single request
// @route  GET /api/blood-requests/:id
const getBloodRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requestedBy', 'name email')
      .populate('matchedDonors', 'name email phone')
      .populate('acceptedDonor', 'name email phone');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update blood request
// @route  PUT /api/blood-requests/:id
const updateBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete blood request
// @route  DELETE /api/blood-requests/:id
const deleteBloodRequest = async (req, res) => {
  try {
    await BloodRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blood request removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Donor accepts request
// @route  POST /api/blood-requests/:id/accept
const acceptRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.acceptedDonor = req.user._id;
    request.status = 'accepted';
    await request.save();

    // Notify requester
    const io = req.app.get('io');
    const notification = await Notification.create({
      user: request.requestedBy,
      title: '✅ Donor Accepted Your Request',
      message: `A donor has accepted your ${request.bloodGroupNeeded} blood request.`,
      type: 'match',
    });

    if (io) {
      io.to(request.requestedBy.toString()).emit('donor_accepted_request', {
        requestId: request._id,
        donorName: req.user.name,
        notification,
      });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Mark as fulfilled
// @route  POST /api/blood-requests/:id/fulfill
const fulfillRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'fulfilled' },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const io = req.app.get('io');
    if (io) io.emit('request_fulfilled', { requestId: request._id });

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Re-run donor matching
// @route  POST /api/blood-requests/:id/match-donors
const matchDonorsForRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const matchedDonorIds = await matchDonors({
      bloodGroupNeeded: request.bloodGroupNeeded,
      city: request.city,
      area: request.area,
      urgencyLevel: request.urgencyLevel,
    });

    request.matchedDonors = matchedDonorIds;
    await request.save();

    res.json({ message: `${matchedDonorIds.length} donors matched`, matchedDonors: matchedDonorIds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  updateBloodRequest,
  deleteBloodRequest,
  acceptRequest,
  fulfillRequest,
  matchDonorsForRequest,
};
