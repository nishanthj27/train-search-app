// backend/src/models/Train.js (modified)
const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  station: { type: String, required: true },
  departureTime: { type: String, required: true },
  distanceFromPrevious: { type: Number, required: true }
});

const trainSchema = new mongoose.Schema({
  trainName: { type: String, required: true, unique: true },
  trainNumber: { type: String, required: true, unique: true },
  stops: [stopSchema]
}, {
  timestamps: true
});

// index for fast station lookups
trainSchema.index({ 'stops.station': 1 });

module.exports = mongoose.model('Train', trainSchema);
