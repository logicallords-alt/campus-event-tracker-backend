const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  event_name: { type: String, required: true },
  event_date: { type: Date, required: true },
  student_name: { type: String, required: true },
  reg_no: { type: String, required: true },
  year: { type: Number },
  department: { type: String },
  result: { type: String },
  certificate_url: { type: String },
  // For team events – one entry per member
  is_team_member: { type: Boolean, default: false },
  team_name: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);
