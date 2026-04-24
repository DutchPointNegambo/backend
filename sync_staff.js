import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from './models/Staff.js';
import User from './models/User.js';

dotenv.config();

const sync = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const staffMembers = await Staff.find({});
        console.log(`Found ${staffMembers.length} staff members.`);

        for (const staff of staffMembers) {
            console.log(`Syncing ${staff.email}...`);
            
            let user = await User.findOne({ email: staff.email.toLowerCase() });
            
            const nameParts = (staff.name || '').split(' ');
            const firstName = nameParts[0] || 'Staff';
            const lastName = nameParts.slice(1).join(' ') || 'Member';

            if (!user) {
                console.log(`Creating new user for ${staff.email}`);
                user = await User.create({
                    firstName,
                    lastName,
                    email: staff.email.toLowerCase(),
                    password: staff.password || 'TemporaryPassword123!', // fallback if no password
                    phone: staff.phone,
                    role: 'staff',
                    status: 'Active'
                });
            } else {
                console.log(`User already exists for ${staff.email}, updating role to staff.`);
                user.role = 'staff';
                if (!user.password && staff.password) user.password = staff.password;
                await user.save();
            }

            staff.user = user._id;
            await staff.save();
        }

        console.log('Sync complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error during sync:', error);
        process.exit(1);
    }
};

sync();
