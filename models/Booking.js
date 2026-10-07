const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
    seatId: { type: String, required: true }, // Changed from seatNumber to seatId (e.g. "R1-S1")
    name: { type: String, required: true, trim: true }
});

const bookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    trainId: { type: String, required: true },
    trainName: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seatClass: { type: String, required: true },
    passengers: [passengerSchema],
    seatsBooked: { type: Number, required: true },
    bookedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
