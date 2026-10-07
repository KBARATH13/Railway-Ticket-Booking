const Train = require('../models/Train');
const Booking = require('../models/Booking');

// Helper: generate a short booking ID
function generateBookingId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BRK-${timestamp}-${rand}`;
}

// @desc    Create a new booking
const createBooking = async (req, res) => {
    const { trainId, seatClass, passengers } = req.body;

    if (!trainId || !seatClass || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({ error: 'trainId, seatClass, and passengers[] are required.' });
    }

    const numSeats = passengers.length;

    try {
        const train = await Train.findOne({ id: trainId });
        if (!train) {
            return res.status(404).json({ error: `Train "${trainId}" not found.` });
        }

        const seatDoc = train.seats.find(s => s.class === seatClass);
        if (!seatDoc) {
            return res.status(404).json({ error: `Class "${seatClass}" not found.` });
        }

        if (seatDoc.available < numSeats) {
            return res.status(409).json({ error: `Not enough seats available. Requested ${numSeats}, only ${seatDoc.available} left.` });
        }

        const totalRows = seatDoc.totalRows;
        const seatsPerRow = seatDoc.seatsPerRow;
        const bookedSet = new Set(seatDoc.bookedSeats);
        const assignedSeats = [];

        // --- Smart Allocation Logic ---
        let found = false;
        // Strategy 1: Find N consecutive in same row
        for (let r = 1; r <= totalRows; r++) {
            let consecutive = 0;
            let startCol = -1;
            for (let c = 1; c <= seatsPerRow; c++) {
                const sid = `R${r}-S${c}`;
                if (!bookedSet.has(sid)) {
                    if (consecutive === 0) startCol = c;
                    consecutive++;
                    if (consecutive === numSeats) {
                        for (let k = 0; k < numSeats; k++) {
                            assignedSeats.push(`R${r}-S${startCol + k}`);
                        }
                        found = true;
                        break;
                    }
                } else {
                    consecutive = 0;
                }
            }
            if (found) break;
        }

        // Strategy 2: Fallback to first N available
        if (!found) {
            for (let r = 1; r <= totalRows; r++) {
                for (let c = 1; c <= seatsPerRow; c++) {
                    if (assignedSeats.length === numSeats) break;
                    const sid = `R${r}-S${c}`;
                    if (!bookedSet.has(sid)) {
                        assignedSeats.push(sid);
                    }
                }
                if (assignedSeats.length === numSeats) break;
            }
        }

        // --- Update Train Document ---
        seatDoc.bookedSeats.push(...assignedSeats);
        seatDoc.available -= numSeats;
        await train.save();

        // --- Create Booking Document ---
        const passengerDocs = passengers.map((name, idx) => ({
            seatId: assignedSeats[idx],
            name: name.trim()
        }));

        const booking = new Booking({
            bookingId: generateBookingId(),
            trainId: train.id,
            trainName: train.name,
            user: req.user._id, // Associate with current user
            seatClass,
            passengers: passengerDocs,
            seatsBooked: numSeats
        });
        await booking.save();

        res.status(201).json({
            message: 'Booking confirmed!',
            booking: {
                bookingId: booking.bookingId,
                trainName: booking.trainName,
                from: train.from,
                to: train.to,
                departure: train.departure,
                arrival: train.arrival,
                seatClass: booking.seatClass,
                seatsBooked: booking.seatsBooked,
                passengers: booking.passengers,
                bookedAt: booking.bookedAt,
                allBookedSeats: seatDoc.bookedSeats,
                totalRows: totalRows,
                seatsPerRow: seatsPerRow
            }
        });

    } catch (err) {
        console.error('createBooking error:', err);
        res.status(500).json({ error: 'Booking failed. Please try again.' });
    }
};

// @desc    Get all bookings
const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id }).sort({ bookedAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

module.exports = {
    createBooking,
    getBookings,
};
