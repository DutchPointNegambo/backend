import EventBooking from '../models/EventBooking.js'

const toDateOnly = (dateStr) => {
    const d = new Date(dateStr)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
 
export const checkAvailability = async (req, res) => {
    try {
        const { date, slot } = req.query
        if (!date || !slot) {
            return res.status(400).json({ message: 'date and slot are required' })
        }

        const eventDate = toDateOnly(date)
        const nextDay = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)

        const existing = await EventBooking.findOne({
            eventDate: { $gte: eventDate, $lt: nextDay },
            timeSlot: slot,
            status: { $ne: 'cancelled' },
        })

        return res.json({ available: !existing })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

 
export const createEventBooking = async (req, res) => {
    try {
        const {
            guestInfo,
            eventType,
            eventDate,
            timeSlot,
            guests,
            decoration,
            foodPackage,
            totalAmount,
        } = req.body

        
        const dateOnly = toDateOnly(eventDate)
        const nextDay = new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000)

        const conflict = await EventBooking.findOne({
            eventDate: { $gte: dateOnly, $lt: nextDay },
            timeSlot,
            status: { $ne: 'cancelled' },
        })

        if (conflict) {
            return res.status(409).json({
                message: 'This date and slot is already booked. Please choose another.',
            })
        }

        const bookingRef = `EVT${Date.now()}`

        const booking = await EventBooking.create({
            bookingRef,
            user: req.user?.id || null,
            guestInfo,
            eventType,
            eventDate: dateOnly,
            timeSlot,
            guests,
            decoration,
            foodPackage,
            totalAmount,
            status: 'confirmed',
        })

        return res.status(201).json(booking)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

 
export const getEventBookings = async (req, res) => {
    try {
        let bookings
        if (req.user.role === 'admin') {
            bookings = await EventBooking.find({})
                .populate('user', 'firstName lastName email')
                .sort({ eventDate: 1 })
        } else {
            bookings = await EventBooking.find({ user: req.user.id }).sort({ eventDate: 1 })
        }
        return res.json(bookings)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}
