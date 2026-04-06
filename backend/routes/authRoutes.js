const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// ─── STUDENT REGISTRATION ────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, reg_no, department, year, email, phone, password } = req.body;
  try {
    let user = await User.findOne({ $or: [{ email }, { reg_no }] });
    if (user) return res.status(400).json({ message: 'User already exists with this email or register number' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, reg_no, department, year, email, phone, password: hashedPassword, role: 'student' });
    await user.save();

    const payload = { id: user.id, role: user.role, department: user.department };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name, role: user.role, department: user.department } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FACULTY REGISTRATION ─────────────────────────────────────────────────────
// One faculty per department rule is enforced here
router.post('/register-faculty', async (req, res) => {
  const { name, faculty_id, department, college_name, email, password } = req.body;

  if (!name || !faculty_id || !department || !college_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check one faculty per department rule
    const deptFaculty = await User.findOne({ role: 'faculty', department: department.trim() });
    if (deptFaculty) {
      return res.status(400).json({ message: `A faculty account for the ${department} department already exists. Only one faculty per department is allowed.` });
    }

    // Check duplicate email or faculty_id
    const existing = await User.findOne({ $or: [{ email }, { faculty_id }] });
    if (existing) return res.status(400).json({ message: 'Faculty already exists with this email or ID' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      faculty_id,
      department: department.trim(),
      college_name,
      email,
      password: hashedPassword,
      role: 'faculty'
    });
    await user.save();

    const payload = { id: user.id, role: user.role, department: user.department };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: { id: user.id, name, role: user.role, department: user.department, college_name: user.college_name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LOGIN (Student / Faculty) ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier = email, reg_no, or faculty_id
  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { reg_no: identifier }, { faculty_id: identifier }]
    });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const payload = { id: user.id, role: user.role, department: user.department };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.department,
        college_name: user.college_name || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  const { name, department, year, phone, college_name } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (department) user.department = department;
    if (year) user.year = year;
    if (phone) user.phone = phone;
    if (college_name && user.role === 'faculty') user.college_name = college_name;

    await user.save();
    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      year: user.year,
      phone: user.phone,
      college_name: user.college_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
