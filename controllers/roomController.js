import Room from '../models/Room.js';


export const getRoomsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { package: pkg } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      filter.type = category;
    }
    if (pkg) filter.package = pkg;
    // console.log('Fetching rooms with filter:', JSON.stringify(filter, null, 2));
    const rooms = await Room.find(filter);
    // console.log(`Found ${rooms.length} rooms for filter:`, JSON.stringify(filter));
    res.json(rooms);
  } catch (error) {
    // console.error('Error fetching rooms by category:', error.message);
    res.status(500).json({ message: 'Server error while fetching rooms' });
  }
};


export const checkRoomAvailability = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check availability with the same roomNumber
    const roomsWithSameNumber = await Room.find({ roomNumber: room.roomNumber });
    const isAnyOccupied = roomsWithSameNumber.some(r => r.status !== 'available');

    res.json({ available: !isAnyOccupied });
  } catch (error) {
    // console.error('Error checking room availability:', error.message);
    res.status(500).json({ message: 'Server error while checking availability' });
  }
};

// GET all 
export const getRooms = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { roomNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (type && type !== 'all') query.type = type;

    const total = await Room.countDocuments(query);
    const rooms = await Room.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      rooms,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET by ID
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// create room
export const createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// update room
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// GET ALL for public (Gallery)
export const getAllRoomsPublic = async (req, res) => {
  try {
    const rooms = await Room.find({}, 'name images type');
    res.json(rooms);
  } catch (error) {
    // console.error('Error fetching all rooms for gallery:', error.message);
    res.status(500).json({ message: 'Server error while fetching gallery rooms' });
  }
};
