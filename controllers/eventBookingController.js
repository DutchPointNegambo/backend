import EventBooking from '../models/EventBooking.js'
import sendEmail from '../utils/sendEmail.js'
import crypto from 'crypto'
import User from '../models/User.js'

// --- PayHere Hash Helper ---
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const amountFormatted = Number(amount).toFixed(2);
    const mainString = merchantId + orderId + amountFormatted + currency + hashedSecret;
    return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
};


const toDateOnly = (dateStr) => {
    const d = new Date(dateStr)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}


const detectCardBrand = (num) => {
    const n = num.replace(/\s/g, '')
    if (/^4/.test(n)) return 'Visa'
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard'
    if (/^3[47]/.test(n)) return 'Amex'
    if (/^6(?:011|5)/.test(n)) return 'Discover'
    return 'Unknown'
}

//Check Availability 
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

//Create
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
            paymentType,
            cardDetails,
            specialRequests,
            addons,
        } = req.body


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


        const paymentMethod = 'payhere'
        const paymentDetails = {
            note: 'Pending PayHere checkout'
        }

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

        //Calculate payment
        const pType = paymentType === 'deposit' ? 'deposit' : 'full'
        const paidAmount = pType === 'deposit' ? Math.round(totalAmount * 0.25) : totalAmount

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
            status: 'pending',
            paymentType: pType,
            paidAmount,
            paymentStatus: 'pending',
            paymentMethod,
            paymentDetails,
            specialRequests: specialRequests || '',
            addons: addons || [],
        })

        await booking.populate('decoration foodPackage')

        const merchantId = (process.env.PAYHERE_MERCHANT_ID || '1226209').trim();
        const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || '3262097392333620346221091696102295398843').trim();

        const payhereParams = {
            sandbox: process.env.PAYHERE_SANDBOX !== 'false',
            merchant_id: merchantId,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel`,
            notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/event-bookings/notify`,
            order_id: booking._id.toString(),
            items: `Event Booking - ${eventType.toUpperCase()} Package`,
            amount: paidAmount.toFixed(2),
            currency: 'LKR',
            hash: generatePayHereHash(merchantId, booking._id.toString(), paidAmount, 'LKR', merchantSecret),
            first_name: guestInfo.firstName,
            last_name: guestInfo.lastName,
            email: guestInfo.email,
            phone: guestInfo.phone || '0771234567',
            address: 'Negombo',
            city: 'Negombo',
            country: 'Sri Lanka'
        };

        return res.status(201).json({
            success: true,
            booking,
            payhere: payhereParams
        });

        //email
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
                                <tr><td style="padding: 6px 0; color: #64748b;">Decoration</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${booking.decoration?.name || 'Standard'}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Food</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${booking.foodPackage?.name || 'Standard'}</td></tr>
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

            sendEmail({
                email: guestInfo.email,
                subject: `Booking Confirmed: ${eventType.toUpperCase()} - ${bookingRef}`,
                html: emailHtml,
            }).catch(emailErr => {
                console.error('Email failed to send:', emailErr)
            })
        } catch (emailErr) {
            console.error('Email prep error:', emailErr)
        }

        return res.status(201).json(booking)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

//old method to get bookings
// export const getEventBookings = async (req, res) => {
//     try {
//         let bookings
//         if (req.user.role === 'admin') {
//             bookings = await EventBooking.find({})
//                 .populate('user', 'firstName lastName email')
//                 .populate('decoration', 'name')
//                 .populate('foodPackage', 'name')
//                 .sort({ eventDate: 1 })
//         } else {
//             bookings = await EventBooking.find({ user: req.user.id })
//                 .populate('decoration', 'name')
//                 .populate('foodPackage', 'name')
//                 .sort({ eventDate: 1 })
//         }
//         return res.json(bookings)
//     } catch (error) {
//         return res.status(500).json({ message: error.message })
//     }
// }

// Admin:Get all event bookings
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

        if (req.query.search) {
            const search = req.query.search.trim()
            const matchingUsers = await User.find({
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }).select('_id')
            const userIds = matchingUsers.map(u => u._id)

            filter.$or = [
                { user: { $in: userIds } },
                { bookingRef: { $regex: search, $options: 'i' } },
                { 'guestInfo.firstName': { $regex: search, $options: 'i' } },
                { 'guestInfo.lastName': { $regex: search, $options: 'i' } },
                { 'guestInfo.email': { $regex: search, $options: 'i' } }
            ]
        }

        const [bookings, total] = await Promise.all([
            EventBooking.find(filter)
                .populate('user', 'firstName lastName email')
                .populate('decoration')
                .populate('foodPackage')
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

// Admin: Update event booking status
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

// Get My Event Bookings
export const getMyEventBookings = async (req, res) => {
    try {
        const bookings = await EventBooking.find({ user: req.user._id })
            .populate('decoration')
            .populate('foodPackage')
            .sort({ createdAt: -1 })
        res.json(bookings)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Admin: Update event payment status
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

export const confirmEventBookingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionId } = req.body;

        const booking = await EventBooking.findById(id).populate('decoration foodPackage');
        if (!booking) {
            return res.status(404).json({ message: 'Event booking not found' });
        }

        booking.status = 'confirmed';
        booking.paymentStatus = booking.paymentType === 'deposit' ? 'deposit_paid' : 'fully_paid';
        booking.paymentDate = new Date();
        booking.paymentDetails = {
            transactionId: transactionId || `TXN-PAYHERE-${Date.now()}`,
            method: 'payhere'
        };

        await booking.save();

        // Send confirmation email
        try {
            const emailHtml = `
                <div style="font-family: 'Inter', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                    <div style="background: linear-gradient(135deg, #0f172a, #334155); padding: 40px 20px; text-align: center; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.025em;">Booking Confirmed!</h1>
                        <p style="margin: 10px 0 0; opacity: 0.8; font-size: 16px;">Reference: ${booking.bookingRef}</p>
                    </div>
                    <div style="padding: 32px 24px;">
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${booking.guestInfo.firstName}, thank you for choosing Dutch Point Resort. Your event booking has been successfully received and confirmed via PayHere.</p>
                        
                        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Event Summary</h3>
                            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                                <tr><td style="padding: 6px 0; color: #64748b;">Type</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${booking.eventType}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${new Date(booking.eventDate).toLocaleDateString()}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Slot</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${booking.timeSlot}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Guests</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${booking.guests}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Decoration</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${booking.decoration?.name || 'Standard'}</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b;">Food</td><td style="padding: 6px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${booking.foodPackage?.name || 'Standard'}</td></tr>
                            </table>
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <table style="width: 100%; font-size: 14px;">
                                <tr><td style="padding: 4px 0;">Total Amount</td><td style="padding: 4px 0; font-weight: 600; text-align: right;">Rs. ${booking.totalAmount.toLocaleString()}</td></tr>
                                <tr><td style="padding: 4px 0; color: #10b981;">Amount Paid (PayHere)</td><td style="padding: 4px 0; font-weight: 700; text-align: right; color: #10b981;">Rs. ${booking.paidAmount.toLocaleString()}</td></tr>
                                ${booking.paymentType === 'deposit' ? `<tr><td style="padding: 4px 0; color: #f59e0b;">Balance Due</td><td style="padding: 4px 0; font-weight: 600; text-align: right; color: #f59e0b;">Rs. ${(booking.totalAmount - booking.paidAmount).toLocaleString()}</td></tr>` : ''}
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
            `;

            sendEmail({
                email: booking.guestInfo.email,
                subject: `Event Booking Confirmed: ${booking.bookingRef}`,
                html: emailHtml
            }).catch(emailErr => {
                console.error('Email failed to send:', emailErr);
            });
        } catch (emailErr) {
            console.error('Email prep error:', emailErr);
        }

        res.status(200).json({
            success: true,
            message: 'Event booking payment confirmed successfully',
            booking
        });
    } catch (error) {
        console.error('Confirm Event Booking Payment Error:', error);
        res.status(500).json({ message: error.message });
    }
};
