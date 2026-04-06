import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { createNotification } from './notificationController.js';

export const createBooking = async (req, res) => {
    try {
        const {
            userId,
            roomId,
            checkIn,
            checkOut,
            guests,
            guestInfo,
            paymentMethod
        } = req.body;

        // 1. Validate room exists
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // 2. Prepare dates
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);

        // Find all rooms in this category that represent this same physical room
        const relatedRooms = await Room.find({ roomNumber: room.roomNumber });
        const relatedIds = relatedRooms.map(r => r._id);

        // 3. Check for overlapping bookings
        const overlappingBooking = await Booking.findOne({
            room: { $in: relatedIds },
            status: { $in: ['confirmed', 'pending'] },
            $or: [
                { checkIn: { $lte: endDate }, checkOut: { $gte: startDate } }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: 'Room is already booked for these dates' });
        }

        // 4. Calculate nights and total
        const diffTime = Math.abs(endDate - startDate);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const subtotal = room.price * nights;
        const total = subtotal; // For now no discounts

        // 4. Create booking
        const bookingId = `BK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        const booking = await Booking.create({
            bookingId,
            user: userId || null, // Allow guest checkout if no userId
            guestInfo,
            room: roomId,
            checkIn: startDate,
            checkOut: endDate,
            guests,
            nights,
            subtotal,
            total,
            status: 'pending', // Default to pending
            paymentMethod: paymentMethod || 'onsite'
        });

        // 5. Update room status if booking starts today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate <= today && endDate > today) {
            await Room.updateMany({ roomNumber: room.roomNumber }, { status: 'occupied' });
        }

        // 6. Create notification for admin
        const guestName = guestInfo?.firstName
            ? `${guestInfo.firstName} ${guestInfo.lastName || ''}`
            : 'A guest';
        await createNotification({
            type: 'NEW_BOOKING',
            title: 'New Booking Received',
            message: `${guestName} booked Room ${room.roomNumber} (${room.type}) for ${nights} night(s). Total: $${total}`,
            link: `/admin/bookings`,
            metadata: { bookingId: booking._id, roomNumber: room.roomNumber }
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('Create Booking Error:', error);
        res.status(500).json({ message: error.message });
    }
};


export const getBookings = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, from, to, userId } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;
        if (userId) query.user = userId;
        if (from || to) {
            query.checkIn = {};
            if (from) query.checkIn.$gte = new Date(from);
            if (to) query.checkIn.$lte = new Date(to);
        }

        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('user', 'firstName lastName email phone')
            .populate('room', 'name type price image roomNumber')
            .sort({ createdAt: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json({
            bookings,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user', 'firstName lastName email phone')
            .populate('room', 'name type price image roomNumber');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!valid.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const oldBooking = await Booking.findById(req.params.id);
        const oldStatus = oldBooking?.status;

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        )
            .populate('user', 'firstName lastName email')
            .populate('room', 'name type');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Notification for cancellation
        if (status === 'cancelled') {
            const guestName = booking.user
                ? `${booking.user.firstName} ${booking.user.lastName}`
                : 'A guest';
            await createNotification({
                type: 'BOOKING_CANCELLED',
                title: 'Booking Cancelled',
                message: `Booking ${booking.bookingId || booking._id} by ${guestName} has been cancelled.`,
                link: '/admin/bookings',
                metadata: { bookingId: booking._id }
            });
        }

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getDashboardStats = async (req, res) => {
    try {
        const [
            totalBookings,
            pendingBookings,
            confirmedBookings,
            totalUsers,
            availableRooms,
            revenueResult,
        ] = await Promise.all([
            Booking.countDocuments(),
            Booking.countDocuments({ status: 'pending' }),
            Booking.countDocuments({ status: 'confirmed' }),
            User.countDocuments({ role: 'guest' }),
            Room.countDocuments({ status: 'available' }),
            Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
        ]);

        res.json({
            totalBookings,
            pendingBookings,
            confirmedBookings,
            totalCustomers: totalUsers,
            availableRooms,
            totalRevenue: revenueResult[0]?.total || 0,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getMonthlyRevenue = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const revenue = await Booking.aggregate([
            {
                $match: {
                    status: { $in: ['confirmed', 'completed'] },
                    createdAt: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    revenue: { $sum: '$total' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const found = revenue.find((r) => r._id === i + 1);
            return { month: i + 1, revenue: found?.revenue || 0, count: found?.count || 0 };
        });

        res.json(monthlyData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
