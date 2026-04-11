const mongoose = require('mongoose');

/**
 * Stores one row of achievement data per verified student.
 * This is the source of truth for Excel exports — no files on disk.
 */
const excelRowSchema = new mongoose.Schema({
  department:             { type: String, required: true, index: true },
  student_name:           { type: String, required: true },
  reg_no:                 { type: String, required: true },
  year:                   { type: String },
  event_name:             { type: String, required: true },
  college_name:           { type: String },
  event_date:             { type: Date },
  participation_type:     { type: String, enum: ['Individual', 'Team'] },
  team_name:              { type: String },
  result:                 { type: String },
  certificate_drive_link: { type: String },
  verified_on:            { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ExcelRow', excelRowSchema);
