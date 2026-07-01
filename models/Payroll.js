import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    employeeId: {
        type: String,
        required: true,
    },
    periodType: {
        type: String,
        enum: ['monthly', 'weekly'],
        default: 'monthly',
    },
    // For monthly: 1–12; for weekly: 1–53
    periodMonth: { type: Number },
    periodWeek: { type: Number },
    periodYear: { type: Number, required: true },
    periodLabel: { type: String }, // e.g. "June 2026" or "Week 26, 2026"
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Basic Info snapshot
    basicSalary: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },     // scheduled working days in period
    presentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    totalWorkHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },

    // Earnings
    basePay: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    // Deductions
    lateDeductions: { type: Number, default: 0 },
    absenceDeductions: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },

    // Net
    netPay: { type: Number, default: 0 },

    // Status
    status: {
        type: String,
        enum: ['Draft', 'Approved', 'Paid', 'Cancelled'],
        default: 'Draft',
    },
    paidAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
}, {
    timestamps: true,
});

// Prevent duplicate payroll for same employee in same period
payrollSchema.index({ employee: 1, periodType: 1, periodYear: 1, periodMonth: 1 }, { unique: true, sparse: true });
payrollSchema.index({ employee: 1, periodType: 1, periodYear: 1, periodWeek: 1 }, { unique: true, sparse: true });

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;
