import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RoomFeature from './models/RoomFeature.js';
import connectDB from './config/database.js';

dotenv.config({ path: './backend/.env' });

const features = [
    'WiFi', 'AC', 'TV', 'Mini Bar', 'Safe', 'Bathtub', 
    'Ocean View', 'Balcony', 'Hair Dryer', 'Room Service', 
    'Mini Fridge', 'Coffee Maker'
];

const seedFeatures = async () => {
    try {
        await connectDB();
        
        for (const name of features) {
            const exists = await RoomFeature.findOne({ name });
            if (!exists) {
                await RoomFeature.create({ name });
                console.log(`Created feature: ${name}`);
            }
        }
        
        console.log('Seeding completed!');
        process.exit();
    } catch (error) {
        console.error('Error seeding features:', error);
        process.exit(1);
    }
};

seedFeatures();
