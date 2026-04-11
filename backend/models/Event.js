const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student_department: { type: String, required: true }, // denormalized for fast dept-based filtering
  event_name: { type: String, required: true },
  college_name: { type: String, required: true },
  event_date: { type: Date, required: true },
  num_days: { type: Number, default: 1, min: 1, max: 10 }, // Number of days the event spans
  event_dates: [{ type: Date }], // Sequence of dates for multi-day events
  event_type: { type: String, enum: ['individual', 'team'], required: true },
  event_banner: { type: String }, // Banner/Poster
  ppt_url: { type: String }, // Optional PPT/presentation file (base64)
  team_name: { type: String },
  team_members: [{ 
    name: { type: String },
    reg_no: { type: String },
    email: { type: String },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' }
  }],
  status: { type: String, enum: ['Pending Team Acceptance', 'Pending Approval', 'Approved', 'Rejected', 'Completed', 'Certificate Verified'], default: 'Pending Approval' },
  faculty_remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
