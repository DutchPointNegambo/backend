import express from 'express';
import { registerUser, loginUser, getUserProfile, updateUserProfile } from '../controllers/authentication.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

export default router;
