const mongoose = require('mongoose');

const geoPhotoSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Number, required: true },
  day_date: { type: Date },
  photo_data: { type: String, required: true }, // Base64 image
  lat: { type: Number },
  lng: { type: Number },
  captured_at: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('GeoPhoto', geoPhotoSchema);
