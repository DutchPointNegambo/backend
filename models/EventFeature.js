import mongoose from 'mongoose';

const eventFeatureSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ['decoration', 'food', 'addon'],
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        default: 0, // Used for decoration and addon
    },
    pricePerHead: {
        type: Number,
        default: 0, // Used only for food
    },
    image: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    includes: [
        {
            type: String,
        }
    ],
    icon: {
        type: String, // Mainly for addons (e.g. "🍹")
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    }
}, {
    timestamps: true,
});

const EventFeature = mongoose.model('EventFeature', eventFeatureSchema);

export default EventFeature;
