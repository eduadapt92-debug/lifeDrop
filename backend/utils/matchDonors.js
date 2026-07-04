const DonorProfile = require('../models/DonorProfile');

// Blood compatibility chart - who can DONATE to whom
const donorCompatibility = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

const matchDonors = async ({ bloodGroupNeeded, city, area, urgencyLevel }) => {
  try {
    const query = {
      eligibilityStatus: true,
      availabilityStatus: true,
    };

    // Only filter by blood group compatibility when a blood group is specified
    if (bloodGroupNeeded) {
      const compatibleGroups = Object.keys(donorCompatibility).filter((group) =>
        donorCompatibility[group].includes(bloodGroupNeeded)
      );
      if (compatibleGroups.length > 0) {
        query.bloodGroup = { $in: compatibleGroups };
      }
    }

    // For non-critical requests, filter by location
    if (urgencyLevel !== 'critical') {
      if (city) query.city = new RegExp(city, 'i');
    }

    // Check last donation date (56 days = 8 weeks minimum between donations)
    const minDonationGap = new Date();
    minDonationGap.setDate(minDonationGap.getDate() - 56);
    query.$or = [
      { lastDonationDate: { $lte: minDonationGap } },
      { lastDonationDate: null },
    ];

    const donorProfiles = await DonorProfile.find(query).populate('user').limit(20);

    // Sort: exact city+area match first, then city, then others
    const sorted = donorProfiles.sort((a, b) => {
      const aScore = (a.city?.toLowerCase() === city?.toLowerCase() ? 2 : 0) +
                     (a.area?.toLowerCase() === area?.toLowerCase() ? 1 : 0);
      const bScore = (b.city?.toLowerCase() === city?.toLowerCase() ? 2 : 0) +
                     (b.area?.toLowerCase() === area?.toLowerCase() ? 1 : 0);
      return bScore - aScore;
    });

    return sorted.map((d) => d.user._id);
  } catch (error) {
    console.error('Donor matching error:', error);
    return [];
  }
};

module.exports = { matchDonors, donorCompatibility };
