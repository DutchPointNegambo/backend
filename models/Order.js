import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    guestInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        notes: { type: String }
    },
    items: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: { type: String }
    }],
    subtotal: { type: Number, required: true },
    serviceCharge: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'paid', 'preparing', 'delivered', 'cancelled'], 
        default: 'pending' 
    },
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'failed'], 
        default: 'pending' 
    },
    paymentDetails: {
        cardLast4: { type: String },
        cardBrand: { type: String },
        transactionId: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
