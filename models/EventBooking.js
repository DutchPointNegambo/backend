import mongoose from 'mongoose'

const eventBookingSchema = new mongoose.Schema(
    {
        bookingRef: {
            type: String,
            unique: true,
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        guestInfo: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String },
        },
        eventType: { type: String, required: true },
        eventDate: { type: Date, required: true },
        timeSlot: { type: String, enum: ['day', 'night'], required: true },
        guests: { type: Number, required: true, min: 1 },
        decoration: { type: String, required: true },
        foodPackage: { type: String, required: true }, 
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'confirmed',
        },
    },
    { timestamps: true }
)

const EventBooking = mongoose.model('EventBooking', eventBookingSchema)
export default EventBooking
