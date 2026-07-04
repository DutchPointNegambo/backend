import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    checkAvailability,
    createEventBooking,
    getMyEventBookings,
    confirmEventBookingPayment,
} from '../controllers/eventBookingController.js'

const router = express.Router()

router.get('/check-availability', checkAvailability)
router.post('/', protect, createEventBooking)
router.get('/my-bookings', protect, getMyEventBookings)
router.post('/:id/confirm-payment', protect, confirmEventBookingPayment)

export default router
