import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './models/Booking.js';
import Order from './models/Order.js';
import EventBooking from './models/EventBooking.js';
import Staff from './models/Staff.js';
import StockLog from './models/StockLog.js';
import connectDB from './config/database.js';

dotenv.config({ path: './backend/.env' });

const checkTotals = async () => {
    try {
        await connectDB();
        
        const [bookings, food, events, payroll, stock] = await Promise.all([
            Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            Order.aggregate([
                { $match: { status: { $in: ['paid', 'delivered'] } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            EventBooking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Staff.aggregate([
                { $match: { status: 'Active' } },
                { $group: { _id: null, total: { $sum: '$salary' } } }
            ]),
            StockLog.aggregate([
                { $match: { changeType: 'IN' } },
                { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitCost'] } } } }
            ])
        ]);

        console.log('--- GLOBAL TOTALS (NO DATE FILTER) ---');
        console.log('Bookings:', bookings[0]?.total || 0);
        console.log('Food:', food[0]?.total || 0);
        console.log('Events:', events[0]?.total || 0);
        console.log('Payroll:', payroll[0]?.total || 0);
        console.log('Stock Cost:', stock[0]?.total || 0);
        
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkTotals();
