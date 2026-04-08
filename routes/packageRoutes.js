import express from 'express';
import { getPackagesByType, getPackageById } from '../controllers/packageController.js';

const router = express.Router();

// Public routes
router.get('/', getPackagesByType);
router.get('/:id', getPackageById);

export default router;
