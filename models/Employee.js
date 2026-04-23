import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    jobTitle: {
        type: String,
        required: true,
        trim: true,
    },
    department: {
        type: String,
        required: true,
        enum: ['Operations', 'Kitchen', 'Front Desk', 'Housekeeping', 'Dining', 'Security', 'Maintenance', 'Finance', 'HR'],
        default: 'Front Desk',
    },
    status: {
        type: String,
        enum: ['Active', 'On Leave', 'Terminated'],
        default: 'Active',
    },
    salary: {
        type: Number,
        default: 0,
    },
    hireDate: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Auto-generate employeeId before saving
employeeSchema.pre('save', async function (next) {
    if (this.employeeId) return next();

    const Employee = mongoose.model('Employee');
    const lastEmployee = await Employee.findOne({}, {}, { sort: { createdAt: -1 } });

    let nextNum = 1;
    if (lastEmployee && lastEmployee.employeeId) {
        const match = lastEmployee.employeeId.match(/EMP-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    this.employeeId = `EMP-${String(nextNum).padStart(3, '0')}`;
    next();
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
