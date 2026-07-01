import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './models/Booking.js';
import Order from './models/Order.js';
import EventBooking from './models/EventBooking.js';
import Employee from './models/Employee.js';
import connectDB from './config/database.js';

dotenv.config({ path: './backend/.env' });

const analyze = async () => {
    try {
        await connectDB();
        
        console.log('--- BOOKINGS BY STATUS ---');
        const b = await Booking.aggregate([{ $group: { _id: '$status', total: { $sum: '$total' }, count: { $sum: 1 } } }]);
        console.log(b);

        console.log('\n--- FOOD ORDERS BY STATUS ---');
        const f = await Order.aggregate([{ $group: { _id: '$status', total: { $sum: '$total' }, count: { $sum: 1 } } }]);
        console.log(f);

        console.log('\n--- EVENT BOOKINGS BY STATUS ---');
        const e = await EventBooking.aggregate([{ $group: { _id: '$status', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]);
        console.log(e);

        console.log('\n--- EMPLOYEE PAYROLL ---');
        const p = await Employee.aggregate([{ $match: { status: 'Active' } }, { $group: { _id: null, total: { $sum: '$salary' } } }]);
        console.log(p);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

analyze();
