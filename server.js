import app from './app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // load .env variables

const PORT = process.env.PORT || 5000;

// 🔗 Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB Atlas Connected");

        // Start server ONLY after DB connects
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
    });