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

// @desc   Login user - step 1: verify password, send OTP
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

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otpCode = crypto.createHash('sha256').update(otp).digest('hex');
    user.otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: user.email,
        subject: 'LifeDrop Login Verification Code',
        html: `
          <h2>Login Verification</h2>
          <p>Your LifeDrop verification code is:</p>
          <h1 style="letter-spacing:4px;">${otp}</h1>
          <p>This code expires in 5 minutes. If you didn't try to log in, you can ignore this email.</p>
        `,
      });
    } catch (emailError) {
      user.otpCode = undefined;
      user.otpExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Could not send verification code. Please try again.' });
    }

    res.json({
      requiresOtp: true,
      userId: user._id,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Login user - step 2: verify OTP, issue token
// @route  POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const hashedOtp = crypto.createHash('sha256').update(otp || '').digest('hex');

    const user = await User.findOne({
      _id: userId,
      otpCode: hashedOtp,
      otpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    user.otpCode = undefined;
    user.otpExpire = undefined;
    await user.save({ validateBeforeSave: false });

    await createAuditLog({
      actor: user._id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id,
      description: `User logged in: ${user.email}`,
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

// @desc   Resend login OTP
// @route  POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otpCode = crypto.createHash('sha256').update(otp).digest('hex');
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      to: user.email,
      subject: 'LifeDrop Login Verification Code',
      html: `
        <h2>Login Verification</h2>
        <p>Your new LifeDrop verification code is:</p>
        <h1 style="letter-spacing:4px;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      `,
    });

    res.json({ message: 'A new verification code has been sent' });
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

module.exports = { register, login, verifyOtp, resendOtp, getMe, forgotPassword, resetPassword };
