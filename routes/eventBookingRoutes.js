import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    checkAvailability,
    createEventBooking,
    getMyEventBookings,
    confirmEventBookingPayment,
    cancelEventBooking,
    getPayHereParams,
} from '../controllers/eventBookingController.js'

const router = express.Router()

router.get('/check-availability', checkAvailability)
router.post('/', protect, createEventBooking)
router.get('/my-bookings', protect, getMyEventBookings)
router.post('/:id/confirm-payment', protect, confirmEventBookingPayment)
router.get('/:id/payhere-params', protect, getPayHereParams)
router.delete('/:id', protect, cancelEventBooking)

export default router
