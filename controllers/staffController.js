import Staff from '../models/Staff.js';


export const getStaff = async (req, res) => {
    try {
        const { status, department, search } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;
        if (department && department !== 'all') query.department = department;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { jobTitle: { $regex: search, $options: 'i' } },
            ];
        }

        const staff = await Staff.find(query).sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createStaff = async (req, res) => {
    try {
        const exists = await Staff.findOne({ email: req.body.email?.toLowerCase() });
        if (exists) {
            return res.status(400).json({ message: 'Staff with this email already exists' });
        }

        const staff = await Staff.create({
            ...req.body,
            email: req.body.email?.toLowerCase(),
        });
        res.status(201).json(staff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


export const updateStaff = async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json(staff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


export const deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json({ message: 'Staff member removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
