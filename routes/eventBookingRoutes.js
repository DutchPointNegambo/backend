import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    checkAvailability,
    createEventBooking,
    getMyEventBookings,
} from '../controllers/eventBookingController.js'

const router = express.Router()

router.get('/check-availability', checkAvailability)
router.post('/', protect, createEventBooking)
router.get('/my-bookings', protect, getMyEventBookings)

export default router
