import Room from '../models/Room.js';


export const getRooms = async (req, res) => {
    try {
        const { status, type } = req.query;
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (type && type !== 'all') query.type = type;

        const rooms = await Room.find(query).sort({ createdAt: -1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST create room
export const createRoom = async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.status(201).json(room);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// PUT update room
export const updateRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json(room);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE room
export const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndDelete(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
