import app from './app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Force Node.js to use Google DNS to bypass local connection issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});