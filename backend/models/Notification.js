const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ['accepted', 'rejected', 'approved', 'faculty_rejected', 'verified', 'info'], default: 'info' },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  read:     { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
