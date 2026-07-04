const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const RecipientProfile = require('../models/RecipientProfile');
const HospitalProfile = require('../models/HospitalProfile');
const BloodInventory = require('../models/BloodInventory');
const BloodRequest = require('../models/BloodRequest');
const DonationRecord = require('../models/DonationRecord');
const Notification = require('../models/Notification');
const Staff = require('../models/Staff');
const AuditLog = require('../models/AuditLog');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected for seeding');
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      DonorProfile.deleteMany(),
      RecipientProfile.deleteMany(),
      HospitalProfile.deleteMany(),
      BloodInventory.deleteMany(),
      BloodRequest.deleteMany(),
      DonationRecord.deleteMany(),
      Notification.deleteMany(),
      Staff.deleteMany(),
      AuditLog.deleteMany(),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const admin = await User.create({
      name: 'Admin LifeDrop',
      email: 'admin@lifedrop.com',
      phone: '+237600000001',
      password: 'Admin@123',
      role: 'admin',
      isVerified: true,
      status: 'active',
    });

    // Create Sarah Jenkins (Donor)
    const sarahUser = await User.create({
      name: 'Sarah Jenkins',
      email: 'sarah@lifedrop.com',
      phone: '+237612345678',
      password: 'Donor@123',
      role: 'donor',
      isVerified: true,
      status: 'active',
    });

    const sarahProfile = await DonorProfile.create({
      user: sarahUser._id,
      gender: 'female',
      dateOfBirth: new Date('1992-05-15'),
      bloodGroup: 'O-',
      city: 'Douala',
      area: 'Akwa',
      weight: 65,
      lastDonationDate: new Date('2024-09-20'),
      healthStatus: 'healthy',
      eligibilityStatus: true,
      availabilityStatus: true,
      donationCount: 24,
      donorTier: 'gold',
      points: 2400,
    });

    // Create more donors
    const donor2 = await User.create({
      name: 'James Mbeki',
      email: 'james@lifedrop.com',
      phone: '+237623456789',
      password: 'Donor@123',
      role: 'donor',
      isVerified: true,
      status: 'active',
    });
    await DonorProfile.create({
      user: donor2._id,
      gender: 'male',
      dateOfBirth: new Date('1988-11-20'),
      bloodGroup: 'A+',
      city: 'Douala',
      area: 'Bonanjo',
      weight: 78,
      lastDonationDate: new Date('2024-07-10'),
      healthStatus: 'healthy',
      eligibilityStatus: true,
      availabilityStatus: true,
      donationCount: 12,
      donorTier: 'silver',
      points: 1200,
    });

    const donor3 = await User.create({
      name: 'Amina Fofana',
      email: 'amina@lifedrop.com',
      phone: '+237634567890',
      password: 'Donor@123',
      role: 'donor',
      isVerified: true,
      status: 'active',
    });
    await DonorProfile.create({
      user: donor3._id,
      gender: 'female',
      dateOfBirth: new Date('1995-03-08'),
      bloodGroup: 'B+',
      city: 'Yaoundé',
      area: 'Bastos',
      weight: 58,
      lastDonationDate: new Date('2024-06-15'),
      healthStatus: 'healthy',
      eligibilityStatus: true,
      availabilityStatus: true,
      donationCount: 6,
      donorTier: 'bronze',
      points: 600,
    });

    const donor4 = await User.create({
      name: 'Paul Nkemdirim',
      email: 'paul@lifedrop.com',
      phone: '+237645678901',
      password: 'Donor@123',
      role: 'donor',
      isVerified: true,
      status: 'active',
    });
    await DonorProfile.create({
      user: donor4._id,
      gender: 'male',
      dateOfBirth: new Date('1980-07-25'),
      bloodGroup: 'AB+',
      city: 'Douala',
      area: 'Bonaberi',
      weight: 82,
      lastDonationDate: new Date('2024-04-01'),
      healthStatus: 'healthy',
      eligibilityStatus: true,
      availabilityStatus: true,
      donationCount: 31,
      donorTier: 'platinum',
      points: 3100,
    });

    // Create Recipient
    const recipientUser = await User.create({
      name: 'Marie Claire Biya',
      email: 'marie@lifedrop.com',
      phone: '+237656789012',
      password: 'Recipient@123',
      role: 'recipient',
      isVerified: true,
      status: 'active',
    });
    await RecipientProfile.create({
      user: recipientUser._id,
      requiredBloodGroup: 'O-',
      city: 'Douala',
      area: 'Akwa',
      hospitalName: 'St. Jude Medical Center',
      urgencyLevel: 'urgent',
      medicalNote: 'Post-surgery blood requirement',
    });

    // Create St. Jude Hospital
    const stjudeUser = await User.create({
      name: 'St. Jude Medical Center',
      email: 'hospital@stjude.com',
      phone: '+237667890123',
      password: 'Hospital@123',
      role: 'hospital',
      isVerified: true,
      status: 'active',
    });
    const stjudeProfile = await HospitalProfile.create({
      user: stjudeUser._id,
      hospitalName: 'St. Jude Medical Center',
      institutionType: 'private',
      city: 'Douala',
      area: 'Akwa',
      address: '12 Rue des Cliniques, Akwa, Douala',
      registrationNumber: 'HOS-CM-2018-001',
      emergencyContact: '+237667890124',
      verificationStatus: 'verified',
      bloodBankAttached: true,
    });

    // Create Bonaberi District Hospital
    const bonaberiUser = await User.create({
      name: 'Bonaberi District Hospital',
      email: 'hospital@bonaberi.cm',
      phone: '+237678901234',
      password: 'Hospital@123',
      role: 'hospital',
      isVerified: true,
      status: 'active',
    });
    const bonaberiProfile = await HospitalProfile.create({
      user: bonaberiUser._id,
      hospitalName: 'Bonaberi District Hospital',
      institutionType: 'public',
      city: 'Douala',
      area: 'Bonaberi',
      address: 'Avenue du Gouvernement, Bonaberi',
      registrationNumber: 'HOS-CM-2015-042',
      emergencyContact: '+237678901235',
      verificationStatus: 'verified',
    });

    // Create Blood Inventory for St. Jude
    const bloodGroups = ['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const inventoryData = [
      { bloodGroup: 'O-', availableUnits: 6, usedUnits: 45, status: 'critical' },
      { bloodGroup: 'O+', availableUnits: 38, usedUnits: 120, status: 'stable' },
      { bloodGroup: 'A+', availableUnits: 82, usedUnits: 200, status: 'optimal' },
      { bloodGroup: 'A-', availableUnits: 14, usedUnits: 30, status: 'low' },
      { bloodGroup: 'B+', availableUnits: 28, usedUnits: 80, status: 'moderate' },
      { bloodGroup: 'B-', availableUnits: 9, usedUnits: 25, status: 'low' },
      { bloodGroup: 'AB+', availableUnits: 95, usedUnits: 60, status: 'optimal' },
      { bloodGroup: 'AB-', availableUnits: 22, usedUnits: 15, status: 'moderate' },
    ];

    for (const item of inventoryData) {
      await BloodInventory.create({
        hospital: stjudeProfile._id,
        ...item,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        storageLocation: 'Blood Bank Unit A',
      });
    }

    // Create Blood Requests
    const req1 = await BloodRequest.create({
      requestedBy: stjudeUser._id,
      requesterRole: 'hospital',
      hospital: stjudeProfile._id,
      bloodGroupNeeded: 'O-',
      quantityNeeded: 4,
      urgencyLevel: 'critical',
      city: 'Douala',
      area: 'Akwa',
      reason: 'Trauma patient - urgent surgery required',
      status: 'matched',
      matchedDonors: [sarahUser._id],
    });

    const req2 = await BloodRequest.create({
      requestedBy: bonaberiUser._id,
      requesterRole: 'hospital',
      hospital: bonaberiProfile._id,
      bloodGroupNeeded: 'A+',
      quantityNeeded: 2,
      urgencyLevel: 'scheduled',
      city: 'Douala',
      area: 'Bonaberi',
      reason: 'Scheduled surgery - knee replacement',
      status: 'open',
    });

    const req3 = await BloodRequest.create({
      requestedBy: recipientUser._id,
      requesterRole: 'recipient',
      bloodGroupNeeded: 'O-',
      quantityNeeded: 1,
      urgencyLevel: 'urgent',
      city: 'Douala',
      area: 'Akwa',
      reason: 'Post-surgery recovery',
      status: 'open',
    });

    // Create Donation Records for Sarah
    const donationDates = [
      new Date('2024-09-20'),
      new Date('2024-06-15'),
      new Date('2024-03-10'),
      new Date('2023-12-05'),
      new Date('2023-09-18'),
    ];

    for (let i = 0; i < donationDates.length; i++) {
      await DonationRecord.create({
        donor: sarahUser._id,
        hospital: stjudeProfile._id,
        bloodGroup: 'O-',
        donationType: 'whole_blood',
        donationDate: donationDates[i],
        unitsDonated: 1,
        status: 'completed',
        certificateUrl: `/uploads/cert-sarah-${i + 1}.pdf`,
      });
    }

    // Create Notifications
    await Notification.create({
      user: sarahUser._id,
      title: '🚨 Critical Blood Request Nearby!',
      message: 'O- blood urgently needed at St. Jude Medical Center, Akwa. 4 units required.',
      type: 'emergency',
      isRead: false,
    });

    await Notification.create({
      user: sarahUser._id,
      title: '🏆 Gold Donor Status Achieved!',
      message: 'Congratulations! You\'ve donated 24 times. You\'ve earned Gold Donor status!',
      type: 'reward',
      isRead: true,
    });

    await Notification.create({
      user: stjudeUser._id,
      title: '⚠️ O- Blood Stock Critical',
      message: 'O- blood group inventory is at 12% capacity. Immediate restocking required.',
      type: 'inventory',
      isRead: false,
    });

    // Create Staff for St. Jude
    await Staff.create([
      { hospital: stjudeProfile._id, name: 'Dr. Emmanuel Koffi', email: 'e.koffi@stjude.com', role: 'doctor', status: 'active', phone: '+237601111111' },
      { hospital: stjudeProfile._id, name: 'Nurse Beatrice Ngo', email: 'b.ngo@stjude.com', role: 'nurse', status: 'active', phone: '+237602222222' },
      { hospital: stjudeProfile._id, name: 'Coordinator Alex Tabi', email: 'a.tabi@stjude.com', role: 'coordinator', status: 'active', phone: '+237603333333' },
      { hospital: stjudeProfile._id, name: 'Tech. Rose Etame', email: 'r.etame@stjude.com', role: 'technician', status: 'active', phone: '+237604444444' },
    ]);

    // Audit logs
    await AuditLog.create([
      { actor: admin._id, action: 'SYSTEM_INIT', entity: 'System', description: 'LifeDrop system initialized with seed data' },
      { actor: stjudeUser._id, action: 'BLOOD_REQUEST_CREATED', entity: 'BloodRequest', entityId: req1._id, description: 'Critical O- blood request created' },
      { actor: sarahUser._id, action: 'LOGIN', entity: 'User', entityId: sarahUser._id, description: 'Donor login' },
    ]);

    console.log('✅ Seed data created successfully!');
    console.log('');
    console.log('🔑 Test Accounts:');
    console.log('  Admin:    admin@lifedrop.com    / Admin@123');
    console.log('  Donor:    sarah@lifedrop.com    / Donor@123');
    console.log('  Hospital: hospital@stjude.com   / Hospital@123');
    console.log('  Recipient: marie@lifedrop.com   / Recipient@123');
    console.log('  Donor 2:  james@lifedrop.com    / Donor@123');
    console.log('  Donor 3:  amina@lifedrop.com    / Donor@123');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();
