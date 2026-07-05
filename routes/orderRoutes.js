import express from 'express';
import { createOrder, getOrders, updateOrderStatus, confirmPayment, getOrderReport } from '../controllers/orderController.js';
import { protect, admin, receptionistOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/', createOrder);
router.post('/:id/confirm-payment', confirmPayment);

// Protected routes
router.get('/', protect, receptionistOrAdmin, getOrders);
router.get('/report', protect, admin, getOrderReport);
router.put('/:id', protect, receptionistOrAdmin, updateOrderStatus);

export default router;
