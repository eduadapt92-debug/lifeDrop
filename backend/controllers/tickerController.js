const BloodRequest   = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');
const Alert          = require('../models/Alert');

// GET /api/ticker — public
exports.getTickerItems = async (req, res) => {
  try {
    const now = new Date();
    const [requests, inventory, adminAlerts] = await Promise.all([
      BloodRequest.find({ status: { $in: ['open', 'matched', 'accepted'] } })
        .populate('requestedBy', '_id name')
        .populate('hospital', 'hospitalName city')
        .sort({ createdAt: -1 })
        .limit(30),
      BloodInventory.find({ status: { $in: ['critical', 'low'] } })
        .populate('hospital', 'hospitalName city')
        .sort({ availableUnits: 1 })
        .limit(20),
      Alert.find({
        isActive: true,
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      }).sort({ createdAt: -1 }).limit(20),
    ]);

    const items = [];

    requests.forEach(r => {
      const hospital = r.hospital?.hospitalName
        ? ` at ${r.hospital.hospitalName}`
        : '';
      const location = r.city ? ` in ${r.city}${r.area ? ` — ${r.area}` : ''}` : '';
      items.push({
        id:          r._id,
        sourceType:  'bloodRequest',
        urgency:     r.urgencyLevel,          // 'critical' | 'urgent' | 'scheduled'
        label:       r.urgencyLevel === 'critical' ? 'CRITICAL'
                   : r.urgencyLevel === 'urgent'   ? 'URGENT'
                   : 'REQUEST',
        message:     `${r.bloodGroupNeeded} blood needed${hospital}${location} — ${r.quantityNeeded} unit${r.quantityNeeded !== 1 ? 's' : ''}`,
        requestedBy: r.requestedBy?._id?.toString(),
        createdAt:   r.createdAt,
      });
    });

    inventory.forEach(inv => {
      const hosp     = inv.hospital?.hospitalName || '';
      const city     = inv.hospital?.city         || '';
      const location = hosp ? ` at ${hosp}${city ? `, ${city}` : ''}` : '';
      items.push({
        id:         inv._id,
        sourceType: 'inventory',
        urgency:    inv.status === 'critical' ? 'critical' : 'low',
        label:      inv.status === 'critical' ? 'CRITICAL STOCK' : 'LOW STOCK',
        message:    `${inv.bloodGroup} blood${location} — ${inv.availableUnits} unit${inv.availableUnits !== 1 ? 's' : ''} remaining`,
        createdAt:  inv.updatedAt,
      });
    });

    // Admin-created alerts
    adminAlerts.forEach(a => {
      items.push({
        id:          a._id,
        sourceType:  'adminAlert',
        urgency:     a.type,
        label:       a.label,
        message:     a.message,
        createdAt:   a.createdAt,
      });
    });

    // Sort: critical first, then urgent, then low/scheduled, then by date
    const urgencyRank = { critical: 0, urgent: 1, low: 2, scheduled: 3 };
    items.sort((a, b) => {
      const ra = urgencyRank[a.urgency] ?? 3;
      const rb = urgencyRank[b.urgency] ?? 3;
      if (ra !== rb) return ra - rb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
