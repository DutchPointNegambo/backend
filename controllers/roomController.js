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
    const rooms = await Room.find(filter);
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms by category:', error.message);
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

    // Check availability for ALL rooms with the same roomNumber
    const roomsWithSameNumber = await Room.find({ roomNumber: room.roomNumber });
    const isAnyOccupied = roomsWithSameNumber.some(r => r.status !== 'available');

    res.json({ available: !isAnyOccupied });
  } catch (error) {
    console.error('Error checking room availability:', error.message);
    res.status(500).json({ message: 'Server error while checking availability' });
  }
};
