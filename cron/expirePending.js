// backend/cron/expirePending.js
import cron from 'node-cron';
import EventBooking from '../models/EventBooking.js';

// Default expiry minutes (can be overridden via env)
const EXPIRY_MINUTES = parseInt(process.env.PENDING_EXPIRY_MINUTES) || 10;

// Runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
    const staleBookings = await EventBooking.find({
      status: 'pending',
      createdAt: { $lte: cutoff },
    });
    if (staleBookings.length) {
      const ids = staleBookings.map(b => b._id);
      await EventBooking.updateMany({ _id: { $in: ids } }, {
        $set: { status: 'cancelled', paymentStatus: 'cancelled' },
      });
      console.log(`[Cron] Expired ${staleBookings.length} pending bookings`);
    }
  } catch (error) {
    console.error('[Cron] Error expiring pending bookings:', error);
  }
});

export default cron;
