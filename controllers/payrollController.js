import Payroll from '../models/Payroll.js';
import PayrollSettings from '../models/PayrollSettings.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const startOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Count scheduled working days (Mon–Sat by default) in a date range
const countWorkingDays = (start, end, daysPerWeek = 6) => {
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay(); // 0=Sun
        if (daysPerWeek === 6 && day !== 0) count++;          // Mon-Sat
        else if (daysPerWeek === 5 && day !== 0 && day !== 6) count++; // Mon-Fri
    }
    return count;
};

// Get ISO week number
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Get start/end dates for a monthly period
const getMonthPeriod = (year, month) => {
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return { periodStart, periodEnd };
};

// Get start/end dates for a weekly period
const getWeekPeriod = (year, week) => {
    // Find the first day of the given ISO week
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOWeekStart = new Date(simple);
    if (dow <= 4) ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const ISOWeekEnd = new Date(ISOWeekStart);
    ISOWeekEnd.setDate(ISOWeekStart.getDate() + 6);
    ISOWeekEnd.setHours(23, 59, 59);
    return { periodStart: ISOWeekStart, periodEnd: ISOWeekEnd };
};

// Core salary calculation
const calculateSalary = (employee, attendanceRecords, settings, workingDays) => {
    const basicSalary = employee.salary || 0;
    const dailyRate = workingDays > 0 ? basicSalary / workingDays : 0;
    const hourlyRate = settings.standardHoursPerDay > 0 ? dailyRate / settings.standardHoursPerDay : 0;
    const lateDeductionAfterCount = Math.max(0, Number(settings.lateDeductionAfterCount ?? 0));
    const latePenaltyPercent = Number(settings.latePenaltyPercent ?? 0);

    const presentDays = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'Half-Day').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'Late').length;
    const totalWorkHours = attendanceRecords.reduce((s, r) => s + (r.workHours || 0), 0);
    const absentDays = workingDays - presentDays - halfDays;

    // Overtime: hours worked beyond threshold per day
    let overtimeHours = 0;
    attendanceRecords.forEach(r => {
        if ((r.workHours || 0) > settings.overtimeThresholdHours) {
            overtimeHours += r.workHours - settings.overtimeThresholdHours;
        }
    });

    // Earnings
    const effectiveDays = presentDays + halfDays * 0.5;
    const basePay = parseFloat((dailyRate * effectiveDays).toFixed(2));
    const overtimePay = parseFloat((overtimeHours * hourlyRate * settings.overtimeMultiplier).toFixed(2));
    const bonus = parseFloat((settings.defaultBonus || 0).toFixed(2));
    const allowances = parseFloat((settings.defaultAllowances || 0).toFixed(2));
    const grossSalary = parseFloat((basePay + overtimePay + bonus + allowances).toFixed(2));

    // Deductions
    const deductibleLateDays = Math.max(0, lateDays - lateDeductionAfterCount);
    const lateDeductions = parseFloat((deductibleLateDays * dailyRate * (latePenaltyPercent / 100)).toFixed(2));
    const absenceDeductions = parseFloat((Math.max(0, absentDays) * dailyRate * (settings.absencePenaltyPercent / 100)).toFixed(2));
    const totalDeductions = parseFloat((lateDeductions + absenceDeductions).toFixed(2));

    const netPay = parseFloat((grossSalary - totalDeductions).toFixed(2));

    return {
        basicSalary,
        workingDays,
        presentDays,
        halfDays,
        lateDays,
        deductibleLateDays,
        absentDays: Math.max(0, absentDays),
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        basePay,
        overtimePay,
        bonus,
        allowances,
        grossSalary,
        lateDeductions,
        absenceDeductions,
        otherDeductions: 0,
        totalDeductions,
        netPay,
    };
};

// ─── GET Settings ────────────────────────────────────────────────────────────
// GET /api/payroll/settings
export const getPayrollSettings = async (req, res) => {
    try {
        let settings = await PayrollSettings.findOne();
        if (!settings) {
            settings = await PayrollSettings.create({});
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/payroll/settings
export const updatePayrollSettings = async (req, res) => {
    try {
        const allowed = [
            'overtimeMultiplier', 'standardHoursPerDay', 'latePenaltyPercent',
            'lateGraceMinutes', 'lateDeductionAfterCount', 'absencePenaltyPercent', 'defaultBonus', 'defaultAllowances',
            'workingDaysPerWeek', 'overtimeThresholdHours',
        ];
        const update = {};
        allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
        update.updatedBy = req.user?._id;

        const settings = await PayrollSettings.findOneAndUpdate(
            {},
            update,
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Dashboard Summary ───────────────────────────────────────────────────────
// GET /api/payroll/dashboard
export const getPayrollDashboard = async (req, res) => {
    try {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [thisMonth, allTime] = await Promise.all([
            Payroll.find({ periodStart: { $gte: firstDay }, periodEnd: { $lte: lastDay } }),
            Payroll.find({ status: 'Paid' }),
        ]);

        const totalThisMonth = thisMonth.reduce((s, p) => s + p.netPay, 0);
        const paidThisMonth = thisMonth.filter(p => p.status === 'Paid').reduce((s, p) => s + p.netPay, 0);
        const pendingCount = thisMonth.filter(p => p.status === 'Draft' || p.status === 'Approved').length;
        const employeesPaid = thisMonth.filter(p => p.status === 'Paid').length;

        // Monthly trend: last 6 months
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const records = await Payroll.find({
                status: 'Paid',
                periodStart: { $gte: mStart },
                periodEnd: { $lte: mEnd },
            });
            monthlyTrend.push({
                month: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                total: parseFloat(records.reduce((s, p) => s + p.netPay, 0).toFixed(2)),
                count: records.length,
            });
        }

        // Recent payrolls
        const recentPayrolls = await Payroll.find()
            .populate('employee', 'name department jobTitle employeeId')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            thisMonth: {
                totalPayroll: parseFloat(totalThisMonth.toFixed(2)),
                totalPaid: parseFloat(paidThisMonth.toFixed(2)),
                employeesPaid,
                pendingCount,
                recordCount: thisMonth.length,
            },
            allTimePaid: parseFloat(allTime.reduce((s, p) => s + p.netPay, 0).toFixed(2)),
            monthlyTrend,
            recentPayrolls,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Preview (without saving) ────────────────────────────────────────────────
// POST /api/payroll/preview
export const previewPayroll = async (req, res) => {
    try {
        const { periodType = 'monthly', year, month, week, employeeId } = req.body;
        const settings = (await PayrollSettings.findOne()) || (await PayrollSettings.create({}));

        let periodStart, periodEnd, workingDays;

        if (periodType === 'monthly') {
            const m = month !== undefined ? parseInt(month) : new Date().getMonth();
            const y = parseInt(year) || new Date().getFullYear();
            ({ periodStart, periodEnd } = getMonthPeriod(y, m));
        } else {
            const w = parseInt(week) || getWeekNumber(new Date());
            const y = parseInt(year) || new Date().getFullYear();
            ({ periodStart, periodEnd } = getWeekPeriod(y, w));
        }

        workingDays = countWorkingDays(periodStart, periodEnd, settings.workingDaysPerWeek);

        // Fetch employees
        const empQuery = employeeId
            ? await Employee.find({ _id: employeeId })
            : await Employee.find({ status: { $ne: 'Terminated' } });

        const attendanceRecords = await Attendance.find({
            date: { $gte: startOfDay(periodStart), $lte: startOfDay(periodEnd) },
            ...(employeeId ? { employee: employeeId } : {}),
        });

        const previews = empQuery.map(emp => {
            const empAtt = attendanceRecords.filter(r => r.employeeId === emp.employeeId);
            const calc = calculateSalary(emp, empAtt, settings, workingDays);
            return {
                employee: { _id: emp._id, name: emp.name, employeeId: emp.employeeId, department: emp.department, jobTitle: emp.jobTitle },
                ...calc,
                periodType,
                periodStart,
                periodEnd,
            };
        });

        res.json({ previews, settings, workingDays });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Generate Payroll ────────────────────────────────────────────────────────
// POST /api/payroll/generate
export const generatePayroll = async (req, res) => {
    try {
        const { periodType = 'monthly', year, month, week, employeeIds, bonus = 0, allowances = 0 } = req.body;
        const settings = (await PayrollSettings.findOne()) || (await PayrollSettings.create({}));

        // Override bonus/allowances if provided
        const effectiveSettings = { ...settings.toObject(), defaultBonus: bonus, defaultAllowances: allowances };

        let periodStart, periodEnd, periodLabel, periodMonth, periodWeek, periodYear;

        if (periodType === 'monthly') {
            periodMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
            periodYear = parseInt(year) || new Date().getFullYear();
            ({ periodStart, periodEnd } = getMonthPeriod(periodYear, periodMonth));
            periodLabel = `${new Date(periodYear, periodMonth, 1).toLocaleString('default', { month: 'long' })} ${periodYear}`;
        } else {
            periodWeek = parseInt(week) || getWeekNumber(new Date());
            periodYear = parseInt(year) || new Date().getFullYear();
            ({ periodStart, periodEnd } = getWeekPeriod(periodYear, periodWeek));
            periodLabel = `Week ${periodWeek}, ${periodYear}`;
        }

        const workingDays = countWorkingDays(periodStart, periodEnd, settings.workingDaysPerWeek);

        // Fetch employees
        const empQuery = employeeIds && employeeIds.length > 0
            ? await Employee.find({ _id: { $in: employeeIds } })
            : await Employee.find({ status: { $ne: 'Terminated' } });

        const attendanceRecords = await Attendance.find({
            date: { $gte: startOfDay(periodStart), $lte: startOfDay(periodEnd) },
        });

        const results = { created: [], updated: [], skipped: [], errors: [] };

        for (const emp of empQuery) {
            const empAtt = attendanceRecords.filter(r => r.employeeId === emp.employeeId);
            const calc = calculateSalary(emp, empAtt, effectiveSettings, workingDays);

            const query = periodType === 'monthly'
                ? { employee: emp._id, periodType, periodYear, periodMonth }
                : { employee: emp._id, periodType, periodYear, periodWeek };

            const existingPayroll = await Payroll.findOne(query);
            if (existingPayroll && existingPayroll.status !== 'Draft') {
                results.skipped.push({ employeeId: emp.employeeId, name: emp.name, reason: `Already ${existingPayroll.status}` });
                continue;
            }

            const payrollData = {
                employee: emp._id,
                employeeId: emp.employeeId,
                periodType,
                periodYear,
                periodMonth,
                periodWeek,
                periodLabel,
                periodStart,
                periodEnd,
                ...calc,
                status: 'Draft',
            };

            try {
                if (existingPayroll) {
                    Object.assign(existingPayroll, payrollData);
                    await existingPayroll.save();
                    results.updated.push(emp.name);
                } else {
                    await Payroll.create(payrollData);
                    results.created.push(emp.name);
                }
            } catch (e) {
                results.errors.push({ employeeId: emp.employeeId, name: emp.name, error: e.message });
            }
        }

        res.json({
            message: `Payroll generated. Created: ${results.created.length}, Updated: ${results.updated.length}, Skipped: ${results.skipped.length}`,
            results,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── List Payrolls ───────────────────────────────────────────────────────────
// GET /api/payroll
export const getPayrolls = async (req, res) => {
    try {
        const { periodType, year, month, week, status, employeeId } = req.query;
        const filter = {};
        if (periodType) filter.periodType = periodType;
        if (year) filter.periodYear = parseInt(year);
        if (month !== undefined) filter.periodMonth = parseInt(month);
        if (week) filter.periodWeek = parseInt(week);
        if (status) filter.status = status;
        if (employeeId) filter.employee = employeeId;

        const payrolls = await Payroll.find(filter)
            .populate('employee', 'name department jobTitle employeeId')
            .populate('paidBy', 'name')
            .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 });

        const totals = {
            totalGross: parseFloat(payrolls.reduce((s, p) => s + p.grossSalary, 0).toFixed(2)),
            totalDeductions: parseFloat(payrolls.reduce((s, p) => s + p.totalDeductions, 0).toFixed(2)),
            totalNet: parseFloat(payrolls.reduce((s, p) => s + p.netPay, 0).toFixed(2)),
            count: payrolls.length,
        };

        res.json({ payrolls, totals });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/payroll/:id
export const getPayrollById = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id)
            .populate('employee', 'name department jobTitle employeeId email phone hireDate')
            .populate('paidBy', 'name');
        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
        res.json(payroll);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Update Status ────────────────────────────────────────────────────────────
// PUT /api/payroll/:id/status
export const updatePayrollStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;
        const validTransitions = {
            Draft: ['Approved', 'Cancelled'],
            Approved: ['Paid', 'Cancelled'],
            Paid: [],
            Cancelled: [],
        };

        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

        if (!validTransitions[payroll.status]?.includes(status)) {
            return res.status(400).json({ message: `Cannot transition from ${payroll.status} to ${status}` });
        }

        payroll.status = status;
        if (notes) payroll.notes = notes;
        if (status === 'Paid') {
            payroll.paidAt = new Date();
            payroll.paidBy = req.user?._id;
        }
        await payroll.save();

        res.json(payroll);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/payroll/:id  — manual adjustment (bonus, allowances, notes)
export const updatePayroll = async (req, res) => {
    try {
        const { bonus, allowances, otherDeductions, notes } = req.body;
        const payroll = await Payroll.findById(req.params.id)
            .populate('employee', 'name department jobTitle employeeId salary');
        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
        if (payroll.status !== 'Draft') return res.status(400).json({ message: 'Only Draft payrolls can be edited' });

        if (bonus !== undefined) payroll.bonus = Number(bonus);
        if (allowances !== undefined) payroll.allowances = Number(allowances);
        if (otherDeductions !== undefined) payroll.otherDeductions = Number(otherDeductions);
        if (notes !== undefined) payroll.notes = notes;

        // Recalculate
        payroll.grossSalary = parseFloat((payroll.basePay + payroll.overtimePay + payroll.bonus + payroll.allowances).toFixed(2));
        payroll.totalDeductions = parseFloat((payroll.lateDeductions + payroll.absenceDeductions + payroll.otherDeductions).toFixed(2));
        payroll.netPay = parseFloat((payroll.grossSalary - payroll.totalDeductions).toFixed(2));

        await payroll.save();
        res.json(payroll);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/payroll/:id
export const deletePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
        if (payroll.status === 'Paid') return res.status(400).json({ message: 'Cannot delete a paid payroll record' });
        await payroll.deleteOne();
        res.json({ message: 'Payroll deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/payroll/employee/:employeeId — history for one employee
export const getEmployeePayrollHistory = async (req, res) => {
    try {
        const employee = await Employee.findOne({ _id: req.params.employeeId });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const records = await Payroll.find({ employee: req.params.employeeId })
            .populate('paidBy', 'name')
            .sort({ periodYear: -1, periodMonth: -1 });

        res.json({ employee, records });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
