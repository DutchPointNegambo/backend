import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        jobTitle: { type: String, required: true, trim: true },
        department: {
            type: String,
            required: true,
            enum: ['Operations', 'Kitchen', 'Front Desk', 'Housekeeping', 'Dining', 'Security', 'Maintenance', 'Finance', 'HR'],
        },
        status: {
            type: String,
            enum: ['Active', 'On Leave', 'Terminated'],
            default: 'Active',
        },
        salary: { type: Number, default: 0, min: 0 },
        hireDate: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
