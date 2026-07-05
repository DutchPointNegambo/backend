import mongoose from 'mongoose';

const payrollSettingsSchema = new mongoose.Schema({
    // This is a singleton document
    overtimeMultiplier: { type: Number, default: 1.5 },     // e.g. 1.5x hourly rate
    standardHoursPerDay: { type: Number, default: 8 },      // working hours per day
    lateGraceMinutes: { type: Number, default: 5 },         // grace period before marking late
    lateDeductionAfterCount: { type: Number, default: 3 },   // late marks before deduction starts
    latePenaltyPercent: { type: Number, default: 5 },       // % of daily rate deducted per late arrival
    absencePenaltyPercent: { type: Number, default: 100 },  // % of daily rate deducted per absent day
    defaultBonus: { type: Number, default: 0 },
    defaultAllowances: { type: Number, default: 0 },
    workingDaysPerWeek: { type: Number, default: 6 },       // Mon-Sat
    overtimeThresholdHours: { type: Number, default: 8 },   // hours after which overtime kicks in
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});

const PayrollSettings = mongoose.model('PayrollSettings', payrollSettingsSchema);
export default PayrollSettings;
