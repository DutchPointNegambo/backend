import express from 'express';
import { protect, admin } from '../middleware/auth.js';

// User management
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/adminController.js';

// Room management
import { getRooms, getRoomById, createRoom, updateRoom, deleteRoom } from '../controllers/roomController.js';

// Booking management
import {
    getBookings,
    getBookingById,
    updateBookingStatus,
    getDashboardStats,
    getMonthlyRevenue,
} from '../controllers/bookingController.js';

// Staff management
import { getStaff, getStaffById, createStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';

// Reports
import { getReportSummary, getMonthlyRevenue as getMonthlyReport } from '../controllers/reportController.js';

const router = express.Router();

// All routes require a valid JWT token + admin role
router.use(protect, admin);

// ── Dashboard ────────────────────────────────────────────────
router.get('/stats', getDashboardStats);
router.get('/revenue/monthly', getMonthlyRevenue);

// ── Users ────────────────────────────────────────────────────
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ── Rooms ────────────────────────────────────────────────────
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// ── Bookings ─────────────────────────────────────────────────
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id/status', updateBookingStatus);

// ── Staff ────────────────────────────────────────────────────
router.get('/staff', getStaff);
router.get('/staff/:id', getStaffById);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);

// ── Reports ──────────────────────────────────────────────────
router.get('/reports/summary', getReportSummary);
router.get('/reports/monthly', getMonthlyReport);

export default router;
