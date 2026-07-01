import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Employee from '../models/Employee.js';
import Order from '../models/Order.js';
import EventBooking from '../models/EventBooking.js';
import StockLog from '../models/StockLog.js';
import Attendance from '../models/Attendance.js';


export const getReportSummary = async (req, res) => {
    try {
        const { from, to } = req.query;
        const dateFilter = {};
        if (from || to) {
            dateFilter.createdAt = {};
            if (from) dateFilter.createdAt.$gte = new Date(from);
            if (to) dateFilter.createdAt.$lte = new Date(to);
        }

        const [
            revenueResult, 
            foodRevenueResult,
            eventRevenueResult,
            salaryResult, 
            inventoryExpenseResult,
            bookingsByStatus, 
            roomsByStatus,
            attendanceResult
        ] = await Promise.all([
          
            Booking.aggregate([
                { $match: { status: { $in: ['reserved', 'checked_in', 'checked_out'] }, ...dateFilter } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),
            
            Order.aggregate([
                { $match: { status: { $in: ['pending', 'paid', 'preparing', 'delivered'] }, ...dateFilter } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),
            
            EventBooking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] }, ...dateFilter } },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
         
            Employee.aggregate([
                { $match: { status: 'Active' } },
                { $group: { _id: null, total: { $sum: '$salary' } } },
            ]),
          
            StockLog.aggregate([
                { $match: { changeType: 'IN', ...dateFilter } },
                { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitCost'] } } } },
            ]),
            Booking.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Room.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
           
            Attendance.find(dateFilter ? { date: dateFilter.createdAt } : {})
                .populate('employee', 'salary status')
        ]);

        const roomRevenue = revenueResult[0]?.total || 0;
        const foodRevenue = foodRevenueResult[0]?.total || 0;
        const eventRevenue = eventRevenueResult[0]?.total || 0;
        const totalRevenue = roomRevenue + foodRevenue + eventRevenue;
        
       
        let actualPayroll = 0;
        if (attendanceResult.length > 0) {
            attendanceResult.forEach(record => {
                if (record.employee && record.employee.salary) {
                    const dailyRate = record.employee.salary / 26; // Assume 26 working days
                    let effectiveDays = 0;
                    if (record.status === 'Present' || record.status === 'Late') effectiveDays = 1;
                    else if (record.status === 'Half-Day') effectiveDays = 0.5;
                    
                    actualPayroll += (dailyRate * effectiveDays);
                }
            });
        } else if (!from && !to) {
            // If no range selected and no attendance, fallback to full monthly salaries for current dashboard
            actualPayroll = salaryResult[0]?.total || 0;
        }

        const inventoryExpenses = inventoryExpenseResult[0]?.total || 0;
        const operationalExpenses = actualPayroll + inventoryExpenses;
        
        const netProfit = totalRevenue - operationalExpenses;

        const totalRooms = roomsByStatus.reduce((s, r) => s + r.count, 0);
        const occupiedRooms = roomsByStatus.find((r) => r._id === 'occupied')?.count || 0;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        res.json({
            totalRevenue,
            roomRevenue,
            foodRevenue,
            eventRevenue,
            operationalExpenses,
            monthlySalaries: actualPayroll,
            inventoryExpenses,
            netProfit,
            bookingCount: (revenueResult[0]?.count || 0) + (eventRevenueResult[0]?.count || 0),
            foodOrderCount: foodRevenueResult[0]?.count || 0,
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

        const [roomRevenue, foodRevenue, eventRevenue] = await Promise.all([
            Booking.aggregate([
                {
                    $match: {
                        status: { $in: ['reserved', 'checked_in', 'checked_out'] },
                        createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
                    },
                },
                { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                {
                    $match: {
                        status: { $in: ['paid', 'delivered'] },
                        createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
                    },
                },
                { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),
            EventBooking.aggregate([
                {
                    $match: {
                        status: { $in: ['confirmed', 'completed'] },
                        createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
                    },
                },
                { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
        ]);

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const r = roomRevenue.find(x => x._id === month)?.revenue || 0;
            const f = foodRevenue.find(x => x._id === month)?.revenue || 0;
            const e = eventRevenue.find(x => x._id === month)?.revenue || 0;
            
            const rc = roomRevenue.find(x => x._id === month)?.count || 0;
            const ec = eventRevenue.find(x => x._id === month)?.count || 0;

            return { 
                month, 
                revenue: r + f + e, 
                count: rc + ec // Counting bookings only for the count chart
            };
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
