import express from 'express';
import { getEventFeatures } from '../controllers/eventFeatureController.js';

const router = express.Router();

router.get('/', getEventFeatures);

export default router;
