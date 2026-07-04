const Alert = require('../models/Alert');

// GET /api/alerts — public, active & unexpired only
exports.getActiveAlerts = async (req, res) => {
  try {
    const now = new Date();
    const alerts = await Alert.find({
      isActive: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/alerts/all — admin only, every alert
exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/alerts — admin only
exports.createAlert = async (req, res) => {
  try {
    const { label, message, type, isActive, expiresAt } = req.body;
    if (!label || !message) return res.status(400).json({ message: 'Label and message are required.' });

    const alert = await Alert.create({
      label,
      message,
      type:      type      || 'info',
      isActive:  isActive  !== undefined ? isActive : true,
      expiresAt: expiresAt || null,
      createdBy: req.user._id,
    });

    // Broadcast to all connected clients so the ticker refreshes live
    const io = req.app.get('io');
    if (io && alert.isActive) io.emit('admin_alert_created', { alertId: alert._id });

    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/alerts/:id — admin only
exports.updateAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });

    const fields = ['label', 'message', 'type', 'isActive', 'expiresAt'];
    fields.forEach(f => { if (req.body[f] !== undefined) alert[f] = req.body[f]; });
    await alert.save();

    const io = req.app.get('io');
    if (io) io.emit('admin_alert_updated', { alertId: alert._id });

    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/alerts/:id — admin only
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    await alert.deleteOne();

    const io = req.app.get('io');
    if (io) io.emit('admin_alert_deleted', { alertId: req.params.id });

    res.json({ message: 'Alert deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
