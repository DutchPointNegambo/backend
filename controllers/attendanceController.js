import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

const LATE_THRESHOLD_HOUR = 9; // 9:00 AM

// Helper: get start of day
const startOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

// POST /api/admin/attendance/scan — QR scan check-in/check-out
export const scanAttendance = async (req, res) => {
    try {
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        // Find the employee
        const employee = await Employee.findOne({ employeeId });
        if (!employee) {
            return res.status(404).json({ message: `Employee ${employeeId} not found` });
        }

        if (employee.status !== 'Active') {
            return res.status(400).json({ message: `Employee ${employee.name} is ${employee.status}` });
        }

        const today = startOfDay();
        const now = new Date();

        // Check for existing attendance today
        let attendance = await Attendance.findOne({ employee: employee._id, date: today });

        if (!attendance) {
            // First scan — CHECK IN
            const isLate = now.getHours() >= LATE_THRESHOLD_HOUR;
            attendance = await Attendance.create({
                employee: employee._id,
                employeeId: employee.employeeId,
                date: today,
                checkIn: now,
                status: isLate ? 'Late' : 'Present',
            });

            return res.json({
                action: 'check-in',
                message: `${employee.name} checked in at ${now.toLocaleTimeString()}`,
                attendance,
                employee: { name: employee.name, department: employee.department, jobTitle: employee.jobTitle },
            });
        }

        if (attendance.checkOut) {
            // Already checked in and out
            return res.status(400).json({
                message: `${employee.name} has already checked out today`,
                attendance,
            });
        }

        // Second scan — CHECK OUT
        const checkInTime = new Date(attendance.checkIn);
        const workHours = parseFloat(((now - checkInTime) / (1000 * 60 * 60)).toFixed(2));
        const status = workHours < 4 ? 'Half-Day' : attendance.status;

        attendance.checkOut = now;
        attendance.workHours = workHours;
        attendance.status = status;
        await attendance.save();

        return res.json({
            action: 'check-out',
            message: `${employee.name} checked out at ${now.toLocaleTimeString()} (${workHours}h)`,
            attendance,
            employee: { name: employee.name, department: employee.department, jobTitle: employee.jobTitle },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/attendance — List attendance records
export const getAttendance = async (req, res) => {
    try {
        const { date, employeeId, status, from, to } = req.query;
        const filter = {};

        if (date) {
            filter.date = startOfDay(new Date(date));
        }
        if (employeeId) filter.employeeId = employeeId;
        if (status) filter.status = status;
        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = startOfDay(new Date(from));
            if (to) filter.date.$lte = startOfDay(new Date(to));
        }

        const records = await Attendance.find(filter)
            .populate('employee', 'name email department jobTitle employeeId')
            .sort({ date: -1, checkIn: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/attendance/today — Today's attendance summary
export const getTodayAttendance = async (req, res) => {
    try {
        const today = startOfDay();
        const totalEmployees = await Employee.countDocuments({ status: 'Active' });
        const records = await Attendance.find({ date: today })
            .populate('employee', 'name email department jobTitle employeeId');

        const present = records.filter(r => r.status === 'Present').length;
        const late = records.filter(r => r.status === 'Late').length;
        const halfDay = records.filter(r => r.status === 'Half-Day').length;
        const absent = totalEmployees - records.length;

        res.json({
            totalEmployees,
            present,
            late,
            halfDay,
            absent,
            records,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/attendance/report — Attendance report for date range
export const getAttendanceReport = async (req, res) => {
    try {
        const { from, to, employeeId } = req.query;
        const filter = {};

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = startOfDay(new Date(from));
            if (to) filter.date.$lte = startOfDay(new Date(to));
        }
        if (employeeId) filter.employeeId = employeeId;

        const records = await Attendance.find(filter)
            .populate('employee', 'name email department jobTitle employeeId salary')
            .sort({ date: -1 });

        // Calculate summary per employee
        const summaryMap = {};
        records.forEach(r => {
            const eid = r.employeeId;
            if (!summaryMap[eid]) {
                summaryMap[eid] = {
                    employee: r.employee,
                    totalDays: 0,
                    presentDays: 0,
                    lateDays: 0,
                    halfDays: 0,
                    absentDays: 0,
                    totalWorkHours: 0,
                };
            }
            summaryMap[eid].totalDays++;
            if (r.status === 'Present') summaryMap[eid].presentDays++;
            if (r.status === 'Late') summaryMap[eid].lateDays++;
            if (r.status === 'Half-Day') summaryMap[eid].halfDays++;
            if (r.status === 'Absent') summaryMap[eid].absentDays++;
            summaryMap[eid].totalWorkHours += r.workHours || 0;
        });

        res.json({
            records,
            summary: Object.values(summaryMap),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/admin/attendance/:id — Manual edit attendance
export const updateAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('employee', 'name email department jobTitle employeeId');

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/payroll — Payroll data based on attendance
export const getPayroll = async (req, res) => {
    try {
        const { month, year } = req.query;
        const now = new Date();
        const targetYear = parseInt(year) || now.getFullYear();
        const targetMonth = parseInt(month) || now.getMonth(); // 0-indexed

        const firstDay = new Date(targetYear, targetMonth, 1);
        const lastDay = new Date(targetYear, targetMonth + 1, 0);

        // Get all active employees
        const employees = await Employee.find({ status: { $ne: 'Terminated' } });

        // Get attendance for the month
        const attendanceRecords = await Attendance.find({
            date: { $gte: firstDay, $lte: lastDay },
        });

        // Build payroll per employee
        const payroll = employees.map(emp => {
            const empRecords = attendanceRecords.filter(r => r.employeeId === emp.employeeId);
            const presentDays = empRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
            const halfDays = empRecords.filter(r => r.status === 'Half-Day').length;
            const totalWorkHours = empRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);

            // Calculate working days in the month (Mon-Sat)
            let workingDays = 0;
            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                const day = d.getDay();
                if (day !== 0) workingDays++; // Exclude Sundays
            }

            const effectiveDays = presentDays + (halfDays * 0.5);
            const dailyRate = emp.salary / workingDays;
            const basePay = parseFloat((dailyRate * effectiveDays).toFixed(2));
            const latePenalty = empRecords.filter(r => r.status === 'Late').length;
            const deductions = parseFloat((latePenalty * (dailyRate * 0.05)).toFixed(2)); // 5% daily rate per late
            const netPay = parseFloat((basePay - deductions).toFixed(2));

            return {
                _id: emp._id,
                employeeId: emp.employeeId,
                name: emp.name,
                department: emp.department,
                jobTitle: emp.jobTitle,
                salary: emp.salary,
                presentDays,
                halfDays,
                lateDays: latePenalty,
                workingDays,
                totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
                basePay,
                deductions,
                netPay,
                status: effectiveDays === 0 ? 'No Attendance' : 'Calculated',
            };
        });

        const totalPayroll = payroll.reduce((sum, p) => sum + p.netPay, 0);
        const totalDeductions = payroll.reduce((sum, p) => sum + p.deductions, 0);

        res.json({
            month: targetMonth,
            year: targetYear,
            payroll,
            totals: {
                totalPayroll: parseFloat(totalPayroll.toFixed(2)),
                totalDeductions: parseFloat(totalDeductions.toFixed(2)),
                employeeCount: payroll.length,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
