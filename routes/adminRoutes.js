import express from 'express';
import { protect, admin } from '../middleware/auth.js';

    // User management
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/adminController.js';

// Room management
import { getRooms, getRoomById, updateRoom, deleteRoom, updateRoomStatusByNumber } from '../controllers/roomController.js';

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
import { getReportSummary, getMonthlyRevenue as getMonthlyReport, getBookingReport } from '../controllers/reportController.js';

// Audit & Notifications
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

// Package management
import {
    getPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
} from '../controllers/packageController.js';

const router = express.Router();


router.use(protect, admin);

//Dashboard 
router.get('/stats', getDashboardStats);
router.get('/revenue/monthly', getMonthlyRevenue);

//Users 
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

//Rooms
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.put('/rooms/:id', updateRoom);
router.put('/rooms/number/:roomNumber/status', updateRoomStatusByNumber);
router.delete('/rooms/:id', deleteRoom);

//Bookings
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id/status', updateBookingStatus);

//Staff
router.get('/staff', getStaff);
router.get('/staff/:id', getStaffById);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);

//Reports
router.get('/reports/summary', getReportSummary);
router.get('/reports/monthly', getMonthlyReport);
router.get('/reports/bookings', getBookingReport);

// Audit & Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllAsRead);
router.put('/notifications/:id/read', markAsRead);

//Packages
router.get('/packages', getPackages);
router.get('/packages/:id', getPackageById);
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

export default router;
