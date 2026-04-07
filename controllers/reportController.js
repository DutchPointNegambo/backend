import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Staff from '../models/Staff.js';


export const getReportSummary = async (req, res) => {
    try {
        const { from, to } = req.query;
        const dateFilter = {};
        if (from || to) {
            dateFilter.createdAt = {};
            if (from) dateFilter.createdAt.$gte = new Date(from);
            if (to) dateFilter.createdAt.$lte = new Date(to);
        }

        const [revenueResult, salaryResult, bookingsByStatus, roomsByStatus] = await Promise.all([
            Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] }, ...dateFilter } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),
            Staff.aggregate([
                { $match: { status: 'Active' } },
                { $group: { _id: null, total: { $sum: '$salary' } } },
            ]),
            Booking.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Room.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);

        const totalRevenue = revenueResult[0]?.total || 0;
        const monthlyExpenses = salaryResult[0]?.total || 0;
        const netProfit = totalRevenue - monthlyExpenses;

        const totalRooms = roomsByStatus.reduce((s, r) => s + r.count, 0);
        const occupiedRooms = roomsByStatus.find((r) => r._id === 'occupied')?.count || 0;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        res.json({
            totalRevenue,
            monthlyExpenses,
            netProfit,
            bookingCount: revenueResult[0]?.count || 0,
            occupancyRate,
            bookingsByStatus,
            roomsByStatus,
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

export const getBookingReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        const dateFilter = {};
        if (from || to) {
            dateFilter.createdAt = {};
            if (from) dateFilter.createdAt.$gte = new Date(from);
            if (to) dateFilter.createdAt.$lte = new Date(to);
        }

        const bookings = await Booking.find(dateFilter)
            .populate('user', 'firstName lastName email phone')
            .populate('room', 'name type roomNumber')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
