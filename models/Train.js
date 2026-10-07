const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    class: { type: String, required: true },
    totalRows: { type: Number, required: true }, // e.g. 10 rows
    seatsPerRow: { type: Number, required: true }, // e.g. 5 seats per row
    total: { type: Number, required: true }, // totalRows * seatsPerRow
    available: { type: Number, required: true }, // derived
    bookedSeats: [{ type: String }] // Array of seat IDs like "R1-S1", "R2-S3"
});

const trainSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    departure: { type: String, required: true },
    arrival: { type: String, required: true },
    seats: [seatSchema]
});

module.exports = mongoose.model('Train', trainSchema);
