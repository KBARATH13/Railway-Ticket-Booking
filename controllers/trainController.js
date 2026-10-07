const Train = require('../models/Train');
const Booking = require('../models/Booking');

// @desc    Get all trains with real-time available seat calculation
const getTrains = async (req, res) => {
    try {
        const trains = await Train.find({});
        
        // Get all bookings to calculate real-time availability
        const bookings = await Booking.find({});
        
        // Create a map of booked seats by trainId and seatClass
        const bookedMap = {};
        bookings.forEach(booking => {
            const key = `${booking.trainId}-${booking.seatClass}`;
            if (!bookedMap[key]) {
                bookedMap[key] = 0;
            }
            bookedMap[key] += booking.seatsBooked;
        });
        
        // Recalculate available seats for each train
        const trainsWithUpdatedSeats = trains.map(train => {
            const trainData = train.toObject();
            trainData.seats = trainData.seats.map(seat => {
                const key = `${train.id}-${seat.class}`;
                const bookedCount = bookedMap[key] || 0;
                const available = Math.max(0, seat.total - bookedCount);
                return {
                    ...seat,
                    available: available
                };
            });
            return trainData;
        });
        
        res.json(trainsWithUpdatedSeats);
    } catch (err) {
        console.error('GET /api/trains error:', err);
        res.status(500).json({ error: 'Failed to fetch trains' });
    }
};

module.exports = {
    getTrains,
};
