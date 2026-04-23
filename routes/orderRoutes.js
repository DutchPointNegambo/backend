import express from 'express';
import { createOrder, getOrders, updateOrderStatus, confirmPayment } from '../controllers/orderController.js';

const router = express.Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.put('/:id', updateOrderStatus);
router.post('/:id/confirm-payment', confirmPayment);

export default router;
