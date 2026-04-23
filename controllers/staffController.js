import Staff from '../models/Staff.js';
import User from '../models/User.js';


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
        
        // Auto-repair: check for staff without users
        for (const s of staff) {
            if (!s.user) {
                let user = await User.findOne({ email: s.email.toLowerCase() });
                if (!user) {
                    const nameParts = (s.name || '').split(' ');
                    const isAlreadyHashed = s.password && s.password.startsWith('$2a$');
                    
                    user = new User({
                        firstName: nameParts[0] || 'Staff',
                        lastName: nameParts.slice(1).join(' ') || 'Member',
                        email: s.email.toLowerCase(),
                        phone: s.phone,
                        role: 'staff',
                        status: 'Active'
                    });

                    if (isAlreadyHashed) {
                        // If it's already hashed, we need to bypass the pre-save hook hashing
                        // The safest way is to just set it and not use .save() for a new doc
                        // but that's hard. So we'll just set it to a temp password and ask to reset.
                        user.password = 'ResetMe123!'; 
                    } else {
                        user.password = s.password || 'ResetMe123!';
                    }
                    await user.save();
                } else {
                    user.role = 'staff';
                    await user.save();
                }
                s.user = user._id;
                await s.save();
            }
        }

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
        const email = req.body.email?.toLowerCase();
        const exists = await Staff.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Staff with this email already exists' });
        }

        // Split name for User model
        const nameParts = req.body.name.split(' ');
        const firstName = nameParts[0] || 'Staff';
        const lastName = nameParts.slice(1).join(' ') || 'Member';

        // Find or create User account
        let user = await User.findOne({ email });
        
        if (user) {
            // If user exists, update role and info
            user.role = 'staff';
            if (req.body.password && req.body.password.trim() !== '') {
                user.password = req.body.password;
            }
            if (req.body.phone) user.phone = req.body.phone;
            user.status = 'Active';
            await user.save();
        } else {
            // Create new User account
            user = await User.create({
                firstName,
                lastName,
                email,
                password: req.body.password,
                phone: req.body.phone,
                role: 'staff',
                status: 'Active'
            });
        }

        const staff = await Staff.create({
            ...req.body,
            email,
            user: user._id
        });

        res.status(201).json(staff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


export const updateStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        // Update fields
        const fields = ['name', 'email', 'phone', 'jobTitle', 'department', 'status', 'salary', 'hireDate', 'annualLeaveBalance'];
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                staff[field] = req.body[field];
            }
        });

        // Sync with User model
        if (staff.user) {
            const user = await User.findById(staff.user);
            if (user) {
                if (req.body.name) {
                    const nameParts = req.body.name.split(' ');
                    user.firstName = nameParts[0];
                    user.lastName = nameParts.slice(1).join(' ') || '';
                }
                if (req.body.email) user.email = req.body.email.toLowerCase();
                if (req.body.phone) user.phone = req.body.phone;
                if (req.body.password && req.body.password.trim() !== '') {
                    user.password = req.body.password;
                }
                if (req.body.status) {
                    user.status = req.body.status === 'Terminated' ? 'Inactive' : 'Active';
                }
                await user.save();
            }
        }

        // Only update local staff password if provided (though login uses User model now)
        if (req.body.password && req.body.password.trim() !== '') {
            staff.password = req.body.password;
        }

        const updatedStaff = await staff.save();
        res.json(updatedStaff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


export const deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        // Delete associated user if exists
        if (staff.user) {
            await User.findByIdAndDelete(staff.user);
        }

        await Staff.findByIdAndDelete(req.params.id);
        res.json({ message: 'Staff member and associated account removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
