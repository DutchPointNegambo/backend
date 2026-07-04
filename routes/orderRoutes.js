import express from 'express';
import { createOrder, getOrders, updateOrderStatus, confirmPayment, getOrderReport } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/', createOrder);
router.post('/:id/confirm-payment', confirmPayment);

// Protected Admin routes
router.get('/', protect, admin, getOrders);
router.get('/report', protect, admin, getOrderReport);
router.put('/:id', protect, admin, updateOrderStatus);

export default router;
