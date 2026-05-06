import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' },
    image: { type: String }, 
    rating: { type: Number, default: 5 },
    prepTime: { type: String, default: '15-20 min' },
    createdAt: { type: Date, default: Date.now }
});

const Food = mongoose.model('Food', foodSchema);
export default Food;
