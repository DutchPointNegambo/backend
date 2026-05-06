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
        addons: [{
            name: { type: String },
            price: { type: Number }
        }],
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            default: 'pending',
        },

        // ─── Payment Fields ─────────────────────────────────────────────
        paymentType: {
            type: String,
            enum: ['deposit', 'full'],
            required: true,
            default: 'full',
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'deposit_paid', 'fully_paid', 'refunded'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            default: 'card',
        },
        paymentDetails: {
            cardLast4: { type: String },
            cardBrand: { type: String },
            transactionId: { type: String },
        },
        specialRequests: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
)

const EventBooking = mongoose.model('EventBooking', eventBookingSchema)
export default EventBooking
