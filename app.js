import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import staffSelfRoutes from './routes/staffSelfRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import eventBookingRoutes from './routes/eventBookingRoutes.js';
import eventFeatureRoutes from './routes/eventFeatureRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import connectDB from './config/database.js';

dotenv.config();

// Connect to Database
// connectDB(); // Moved to server.js

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffSelfRoutes);
app.use('/api/admin', employeeRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/event-bookings', eventBookingRoutes);
app.use('/api/event-features', eventFeatureRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/offers', offerRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'API is running' });
});

export default app;
