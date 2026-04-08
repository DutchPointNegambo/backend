import express from 'express'
//need to add auth middleware to protect routes and get user info for bookings
import {
    checkAvailability,
    createEventBooking,
    getEventBookings,
} from '../controllers/eventBookingController.js'

const router = express.Router()
router.get('/check-availability', checkAvailability)
router.get('/',getEventBookings)
router.post('/',createEventBooking)

export default router
