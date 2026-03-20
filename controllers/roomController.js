import Room from '../models/Room.js';


export const getRoomsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const rooms = await Room.find({ type: category });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms by category:', error.message);
    res.status(500).json({ message: 'Server error while fetching rooms' });
  }
};


export const checkRoomAvailability = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'roomId, checkIn, and checkOut are required' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

  
    const available = room.status === 'available';
    res.json({ available });
  } catch (error) {
    console.error('Error checking room availability:', error.message);
    res.status(500).json({ message: 'Server error while checking availability' });
  }
};
