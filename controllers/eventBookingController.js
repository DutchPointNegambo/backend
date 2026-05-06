import EventBooking from '../models/EventBooking.js'
import sendEmail from '../utils/sendEmail.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDateOnly = (dateStr) => {
    const d = new Date(dateStr)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Detect card brand from number */
const detectCardBrand = (num) => {
    const n = num.replace(/\s/g, '')
    if (/^4/.test(n)) return 'Visa'
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard'
    if (/^3[47]/.test(n)) return 'Amex'
    if (/^6(?:011|5)/.test(n)) return 'Discover'
    return 'Unknown'
}

// ─── Public: Check Availability ───────────────────────────────────────────────
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

// ─── Public: Create Event Booking ─────────────────────────────────────────────
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
            paymentType,     // 'deposit' | 'full'
            cardDetails,     // { number, expiry, cvv, name }
            specialRequests,
            addons,          // [{ name, price }]
        } = req.body

        // ── Validate guest info ──────────────────────────────────────────
        if (!guestInfo?.firstName || !guestInfo?.lastName || !guestInfo?.email) {
            return res.status(400).json({ message: 'First name, last name, and email are required.' })
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(guestInfo.email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' })
        }
        if (guestInfo.phone && !/^[0-9]{10}$/.test(guestInfo.phone)) {
            return res.status(400).json({ message: 'Phone number must be 10 digits.' })
        }

        // ── Validate card ────────────────────────────────────────────────
        if (!cardDetails || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
            return res.status(400).json({ message: 'All card details are required.' })
        }

        const cardNum = cardDetails.number.replace(/\s/g, '')
        if (!/^\d{13,19}$/.test(cardNum)) {
            return res.status(400).json({ message: 'Invalid card number.' })
        }

        // Luhn check
        let sum = 0, alt = false
        for (let i = cardNum.length - 1; i >= 0; i--) {
            let n = parseInt(cardNum[i], 10)
            if (alt) { n *= 2; if (n > 9) n -= 9 }
            sum += n
            alt = !alt
        }
        if (sum % 10 !== 0) {
            return res.status(400).json({ message: 'Card number failed validation.' })
        }

        // Expiry check MM/YY
        const expiryMatch = cardDetails.expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
        if (!expiryMatch) {
            return res.status(400).json({ message: 'Card expiry must be MM/YY format.' })
        }
        const expMonth = parseInt(expiryMatch[1], 10)
        const expYear = 2000 + parseInt(expiryMatch[2], 10)
        const now = new Date()
        if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < (now.getMonth() + 1))) {
            return res.status(400).json({ message: 'Card has expired.' })
        }

        // CVV
        if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
            return res.status(400).json({ message: 'CVV must be 3 or 4 digits.' })
        }

        // ── Conflict check ───────────────────────────────────────────────
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

        // ── Calculate payment ────────────────────────────────────────────
        const pType = paymentType === 'deposit' ? 'deposit' : 'full'
        const paidAmount = pType === 'deposit' ? Math.round(totalAmount * 0.25) : totalAmount
        const paymentStatus = pType === 'deposit' ? 'deposit_paid' : 'fully_paid'

        const bookingRef = `EVT${Date.now()}`

        const booking = await EventBooking.create({
            bookingRef,
            user: req.user._id,
            guestInfo,
            eventType,
            eventDate: dateOnly,
            timeSlot,
            guests,
            decoration,
            foodPackage,
            totalAmount,
            status: 'confirmed',
            paymentType: pType,
            paidAmount,
            paymentStatus,
            paymentMethod: 'card',
            paymentDetails: {
                cardLast4: cardNum.slice(-4),
                cardBrand: detectCardBrand(cardNum),
                transactionId: `TXN${Date.now()}`,
            },
            specialRequests: specialRequests || '',
            addons: addons || [],
        })

        // ── Send Confirmation Email ─────────────────────────────────────
        try {
            const emailHtml = `
                <div style="font-family: 'Inter', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                    <div style="background: linear-gradient(135deg, #0f172a, #334155); padding: 40px 20px; text-align: center; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.025em;">Booking Confirmed!</h1>
                        <p style="margin: 10px 0 0; opacity: 0.8; font-size: 16px;">Reference: ${bookingRef}</p>
                    </div>
                    <div style="padding: 32px 24px;">
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${guestInfo.firstName}, thank you for choosing Dutch Point Resort. Your event booking has been successfully received and confirmed.</p>
                        
                        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Event Summary</h3>
                            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                                <tr><td style="padding: 6px 0; color: #64748b;">Type</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${eventType}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${new Date(eventDate).toLocaleDateString()}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Slot</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${timeSlot}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Guests</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${guests}</td></tr>
                            </table>
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <table style="width: 100%; font-size: 14px;">
                                <tr><td style="padding: 4px 0;">Total Amount</td><td style="padding: 4px 0; font-weight: 600; text-align: right;">Rs. ${totalAmount.toLocaleString()}</td></tr>
                                <tr><td style="padding: 4px 0; color: #10b981;">Amount Paid</td><td style="padding: 4px 0; font-weight: 700; text-align: right; color: #10b981;">Rs. ${paidAmount.toLocaleString()}</td></tr>
                                ${pType === 'deposit' ? `<tr><td style="padding: 4px 0; color: #f59e0b;">Balance Due</td><td style="padding: 4px 0; font-weight: 600; text-align: right; color: #f59e0b;">Rs. ${(totalAmount - paidAmount).toLocaleString()}</td></tr>` : ''}
                            </table>
                        </div>

                        <div style="margin-top: 32px; text-align: center;">
                            <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">We look forward to hosting your special day!</p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-events" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">View My Booking</a>
                        </div>
                    </div>
                    <div style="background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                        <p style="margin: 0;">Dutch Point Resort, Negombo, Sri Lanka</p>
                        <p style="margin: 4px 0 0;">This is an automated confirmation email.</p>
                    </div>
                </div>
            `

            await sendEmail({
                email: guestInfo.email,
                subject: `Booking Confirmed: ${eventType.toUpperCase()} - ${bookingRef}`,
                html: emailHtml,
            })
        } catch (emailErr) {
            console.error('Email failed to send:', emailErr)
            // We don't fail the booking if email fails, but we log it
        }

        return res.status(201).json(booking)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

// ─── Public: Get own bookings ─────────────────────────────────────────────────
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

// ─── Admin: Get all event bookings (paginated + filtered) ─────────────────────
export const adminGetEventBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 15
        const skip = (page - 1) * limit

        const filter = {}
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status
        }
        if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
            filter.paymentStatus = req.query.paymentStatus
        }

        const [bookings, total] = await Promise.all([
            EventBooking.find(filter)
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            EventBooking.countDocuments(filter),
        ])

        return res.json({
            bookings,
            total,
            page,
            pages: Math.ceil(total / limit),
        })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

// ─── Admin: Update event booking status ───────────────────────────────────────
export const adminUpdateEventStatus = async (req, res) => {
    try {
        const booking = await EventBooking.findById(req.params.id)
        if (!booking) return res.status(404).json({ message: 'Event booking not found.' })

        booking.status = req.body.status || booking.status
        await booking.save()

        return res.json(booking)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

// ─── User: Get My Event Bookings ──────────────────────────────────────────────
export const getMyEventBookings = async (req, res) => {
    try {
        const bookings = await EventBooking.find({ user: req.user._id }).sort({ createdAt: -1 })
        res.json(bookings)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// ─── Admin: Update event payment status ───────────────────────────────────────
export const adminUpdateEventPayment = async (req, res) => {
    try {
        const booking = await EventBooking.findById(req.params.id)
        if (!booking) return res.status(404).json({ message: 'Event booking not found.' })

        if (req.body.paymentStatus) {
            booking.paymentStatus = req.body.paymentStatus
        }
        if (req.body.paymentStatus === 'fully_paid') {
            booking.paidAmount = booking.totalAmount
        }
        if (req.body.paymentStatus === 'refunded') {
            booking.paidAmount = 0
        }

        await booking.save()
        return res.json(booking)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}
