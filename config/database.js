import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (error.message.includes('ECONNREFUSED')) {
            console.error('CRITICAL: Check your IP Whitelist in MongoDB Atlas.');
        }
        process.exit(1);
    }
};

export default connectDB;
