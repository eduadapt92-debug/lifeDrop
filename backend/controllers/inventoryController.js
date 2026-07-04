const BloodInventory = require('../models/BloodInventory');
const HospitalProfile = require('../models/HospitalProfile');
const Notification = require('../models/Notification');

const getStatusFromUnits = (units) => {
  if (units <= 5) return 'critical';
  if (units <= 15) return 'low';
  if (units <= 30) return 'moderate';
  if (units <= 60) return 'stable';
  return 'optimal';
};

// @desc   Add/update inventory
// @route  POST /api/inventory
const addInventory = async (req, res) => {
  try {
    const { bloodGroup, availableUnits, usedUnits, expiredUnits, expiryDate, storageLocation } = req.body;
    const hospital = await HospitalProfile.findOne({ user: req.user._id });
    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });

    const status = getStatusFromUnits(availableUnits);

    let inventory = await BloodInventory.findOne({ hospital: hospital._id, bloodGroup });
    if (inventory) {
      inventory.availableUnits = availableUnits;
      inventory.usedUnits = usedUnits || inventory.usedUnits;
      inventory.expiredUnits = expiredUnits || inventory.expiredUnits;
      inventory.expiryDate = expiryDate || inventory.expiryDate;
      inventory.storageLocation = storageLocation || inventory.storageLocation;
      inventory.status = status;
      await inventory.save();
    } else {
      inventory = await BloodInventory.create({
        hospital: hospital._id,
        bloodGroup,
        availableUnits,
        usedUnits: usedUnits || 0,
        expiredUnits: expiredUnits || 0,
        expiryDate,
        storageLocation,
        status,
      });
    }

    // Emit low stock alert
    if (status === 'critical' || status === 'low') {
      const io = req.app.get('io');
      if (io) io.emit('inventory_low', { bloodGroup, availableUnits, hospitalId: hospital._id, status });
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get inventory (for current hospital)
// @route  GET /api/inventory
const getInventory = async (req, res) => {
  try {
    let query = {};
    if (req.user?.role === 'hospital') {
      const hospital = await HospitalProfile.findOne({ user: req.user._id });
      if (hospital) query.hospital = hospital._id;
    }
    const inventory = await BloodInventory.find(query).populate('hospital', 'hospitalName city');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update inventory record
// @route  PUT /api/inventory/:id
const updateInventory = async (req, res) => {
  try {
    const status = req.body.availableUnits !== undefined
      ? getStatusFromUnits(req.body.availableUnits)
      : undefined;
    const updateData = { ...req.body };
    if (status) updateData.status = status;

    const inventory = await BloodInventory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!inventory) return res.status(404).json({ message: 'Inventory record not found' });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete inventory record
// @route  DELETE /api/inventory/:id
const deleteInventory = async (req, res) => {
  try {
    await BloodInventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inventory record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get low stock inventory
// @route  GET /api/inventory/low-stock
const getLowStock = async (req, res) => {
  try {
    const inventory = await BloodInventory.find({
      status: { $in: ['critical', 'low'] },
    }).populate('hospital', 'hospitalName city emergencyContact');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addInventory, getInventory, updateInventory, deleteInventory, getLowStock };
