const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Student fields
  reg_no: { type: String, unique: true, sparse: true },
  year: { type: String },
  phone: { type: String },
  // Faculty fields
  faculty_id: { type: String, unique: true, sparse: true },  // Employee/Staff ID
  college_name: { type: String },                            // College name for faculty
  // Shared
  department: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty'], default: 'student' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
