import express from 'express';
import { registerUser, loginUser, googleAuth, getUserProfile, updateUserProfile } from '../controllers/authentication.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

export default router;
