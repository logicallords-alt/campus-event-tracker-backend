const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  live_photo_url: { type: String },
  timestamp: { type: Date },
  gps_location: { type: { lat: Number, lng: Number } },
  certificate_url: { type: String },       // Lead student's certificate
  event_photos: [{ type: String }],
  // Per-day photos: [{ day: 1, photo_url, lat, lng, timestamp }]
  day_photos: [{
    day: { type: Number, required: true },
    photo_url: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    timestamp: { type: Date }
  }],
  result: { type: String, enum: ['Won', 'Participated'] },
  verification_status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  team_certificates: [{ type: String }],   // Legacy (kept for backward compat)
  certificate_missing_reason: { type: String },
  certificate_drive_link: { type: String }, // Lead's Google Drive link
  // Per-member drive links: [{ email, drive_link }]
  team_member_drive_links: [{
    email: { type: String, required: true },
    drive_link: { type: String }
  }],
  // Per-member certificates: [{ email, certificate_url }]
  team_member_certificates: [{
    email: { type: String, required: true },
    certificate_url: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
