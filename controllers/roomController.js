import Room from '../models/Room.js';
import Booking from '../models/Booking.js';



export const getRoomsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { package: pkg, checkIn, checkOut } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      filter.type = category;
    }
    if (pkg) filter.package = pkg;

    const rooms = await Room.find(filter);

    // If dates are provided OR check current availability by default
    const start = checkIn ? new Date(checkIn) : new Date();
    const end = checkOut ? new Date(checkOut) : new Date();
    
    // For "current status" check when no dates provided, set to 00:00:00 to match booking logic
    if (!checkIn) {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    }

    // Find all rooms in this category
    const roomIds = rooms.map(r => r._id);
    
    // We need to check availability against ALL rooms with the same roomNumber
    // because one physical room might have multiple "Room" objects for different packages
    const roomNumbers = rooms.map(r => r.roomNumber);
    const allRelatedRooms = await Room.find({ roomNumber: { $in: roomNumbers } });
    const allRelatedIds = allRelatedRooms.map(r => r._id);

    const bookings = await Booking.find({
      room: { $in: allRelatedIds },
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $lte: end }, checkOut: { $gte: start } }
      ]
    });

    const roomsWithAvailability = rooms.map(room => {
      // Find all IDs for this specific room number
      const relatedIds = allRelatedRooms
        .filter(r => r.roomNumber === room.roomNumber)
        .map(r => r._id.toString());
        
      const isOccupied = bookings.some(b => 
        relatedIds.includes(b.room.toString())
      );

      return {
        ...room.toObject(),
        isAvailable: !isOccupied
      };
    });

    return res.json(roomsWithAvailability);
  } catch (error) {
    console.error('getRoomsByCategory error:', error);
    res.status(500).json({ message: 'Server error while fetching rooms with availability' });
  }
};


export const checkRoomAvailability = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Find all room objects that represent this same physical room
    const relatedRooms = await Room.find({ roomNumber: room.roomNumber });
    const relatedIds = relatedRooms.map(r => r._id);

    // Rule: Room is unavailable if RequestedIn <= Existing Checkout
    const overlappingBooking = await Booking.findOne({
      room: { $in: relatedIds },
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $lte: end }, checkOut: { $gte: start } }
      ]
    });

    res.json({ available: !overlappingBooking });
  } catch (error) {
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
