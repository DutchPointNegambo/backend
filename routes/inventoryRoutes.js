import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  deleteInventoryItem,
  getStockLogs,
  getAllStockLogs
} from '../controllers/inventoryController.js';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplierController.js';

const router = express.Router();

// Inventory Routes
router.route('/')
  .get(protect, getInventory)
  .post(protect, admin, createInventoryItem);

router.route('/:id')
  .put(protect, admin, updateInventoryItem)
  .delete(protect, admin, deleteInventoryItem);

router.get('/logs/all', protect, admin, getAllStockLogs);
router.post('/:id/adjust', protect, adjustStock);
router.get('/:id/logs', protect, getStockLogs);

// Supplier Routes
router.route('/suppliers')
  .get(protect, getSuppliers)
  .post(protect, admin, createSupplier);

router.route('/suppliers/:id')
  .put(protect, admin, updateSupplier)
  .delete(protect, admin, deleteSupplier);

export default router;
