import Employee from '../models/Employee.js';

// GET /api/admin/staff — List all employees
export const getEmployees = async (req, res) => {
    try {
        const { search, department, status } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { jobTitle: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        if (department) filter.department = department;
        if (status) filter.status = status;

        const employees = await Employee.find(filter).sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/admin/staff — Create employee
export const createEmployee = async (req, res) => {
    try {
        const { name, email, phone, jobTitle, department, status, salary, hireDate } = req.body;

        const exists = await Employee.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }

        const employee = await Employee.create({
            name, email, phone, jobTitle, department, status, salary, hireDate,
        });

        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/admin/staff/:id — Update employee
export const updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/admin/staff/:id — Delete employee
export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ message: 'Employee removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/staff/:id/qr — Get employee QR data
export const getEmployeeQR = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('employeeId name department jobTitle');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({
            qrData: employee.employeeId,
            employee: {
                employeeId: employee.employeeId,
                name: employee.name,
                department: employee.department,
                jobTitle: employee.jobTitle,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
