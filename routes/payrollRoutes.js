import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import {
    getPayrollSettings,
    updatePayrollSettings,
    getPayrollDashboard,
    previewPayroll,
    generatePayroll,
    getPayrolls,
    getPayrollById,
    updatePayrollStatus,
    updatePayroll,
    deletePayroll,
    getEmployeePayrollHistory,
} from '../controllers/payrollController.js';

const router = express.Router();

router.use(protect, admin);

// Settings
router.get('/settings', getPayrollSettings);
router.put('/settings', updatePayrollSettings);

// Dashboard
router.get('/dashboard', getPayrollDashboard);

// List & Generate
router.get('/', getPayrolls);
router.post('/preview', previewPayroll);
router.post('/generate', generatePayroll);

// Single record
router.get('/employee/:employeeId', getEmployeePayrollHistory);
router.get('/:id', getPayrollById);
router.put('/:id/status', updatePayrollStatus);
router.put('/:id', updatePayroll);
router.delete('/:id', deletePayroll);

export default router;
