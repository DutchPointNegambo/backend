import EventFeature from '../models/EventFeature.js';

// --- Public: Fetch all features by category ---
export const getEventFeatures = async (req, res) => {
    try {
        const { category } = req.query;
        const filter = { status: 'active' };
        if (category && category !== 'all') {
            filter.category = category;
        }
        const features = await EventFeature.find(filter).sort({ createdAt: 1 });
        res.json(features);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Admin: Get all features (paginated + filtered) ---
export const adminGetEventFeatures = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 20 } = req.query;
        const query = {};

        if (category && category !== 'all') query.category = category;
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const total = await EventFeature.countDocuments(query);
        const features = await EventFeature.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json({
            features,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Admin: Create new feature ---
export const createEventFeature = async (req, res) => {
    try {
        const feature = await EventFeature.create(req.body);
        res.status(201).json(feature);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Admin: Update feature ---
export const updateEventFeature = async (req, res) => {
    try {
        const feature = await EventFeature.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!feature) return res.status(404).json({ message: 'Feature not found' });
        res.json(feature);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Admin: Delete feature ---
export const deleteEventFeature = async (req, res) => {
    try {
        const feature = await EventFeature.findByIdAndDelete(req.params.id);
        if (!feature) return res.status(404).json({ message: 'Feature not found' });
        res.json({ message: 'Feature deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
