import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';


export const getBookings = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, from, to } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;
        if (from || to) {
            query.checkIn = {};
            if (from) query.checkIn.$gte = new Date(from);
            if (to) query.checkIn.$lte = new Date(to);
        }

        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('user', 'firstName lastName email phone')
            .populate('room', 'name type price image')
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
            .populate('room', 'name type price image');
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

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        )
            .populate('user', 'firstName lastName email')
            .populate('room', 'name type');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });
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
