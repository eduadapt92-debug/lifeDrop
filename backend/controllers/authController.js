const crypto = require('crypto');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const RecipientProfile = require('../models/RecipientProfile');
const HospitalProfile = require('../models/HospitalProfile');
const BloodBankProfile = require('../models/BloodBankProfile');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const createAuditLog = require('../utils/createAuditLog');

// @desc   Register user
// @route  POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, ...profileData } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({ name, email, phone, password, role });

    // Create role-specific profile
    if (role === 'donor') {
      await DonorProfile.create({ user: user._id, ...profileData });
    } else if (role === 'recipient') {
      await RecipientProfile.create({ user: user._id, ...profileData });
    } else if (role === 'hospital') {
      await HospitalProfile.create({ user: user._id, hospitalName: name, ...profileData });
    } else if (role === 'bloodbank') {
      await BloodBankProfile.create({ user: user._id, bloodBankName: name, ...profileData });
    }

    await createAuditLog({
      actor: user._id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user._id,
      description: `New ${role} registered: ${email}`,
      ipAddress: req.ip,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    await createAuditLog({
      actor: user._id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id,
      description: `User logged in: ${email}`,
      ipAddress: req.ip,
    });

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get current user
// @route  GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Forgot password
// @route  POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No user with that email' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'LifeDrop Password Reset',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the link below:</p>
          <a href="${resetUrl}" style="background:#C41E3A;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>This link expires in 10 minutes.</p>
          <p>If you didn't request this, ignore this email.</p>
        `,
      });
      res.json({ message: 'Password reset email sent' });
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Reset password
// @route  POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };
