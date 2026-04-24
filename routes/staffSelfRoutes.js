import express from 'express';
import { protect } from '../middleware/auth.js';
import { 
    getMyProfile, 
    updateMyProfile, 
    getMyAttendance, 
    getMyLastPayroll 
} from '../controllers/staffSelfController.js';

const router = express.Router();

// Middleware to ensure the user is at least a staff member
const staffOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Staff only.' });
    }
};

router.use(protect, staffOnly);

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.get('/attendance', getMyAttendance);
router.get('/payroll/last', getMyLastPayroll);

export default router;
