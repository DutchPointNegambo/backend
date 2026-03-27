// Get all rooms
export const getRooms = async (req, res) => {
  const rooms = await Room.find();
  res.json(rooms);
};

// Get room by ID
export const getRoomById = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(room);
};

// Update room
export const updateRoom = async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(room);
};

// Delete room
export const deleteRoom = async (req, res) => {
  const room = await Room.findByIdAndDelete(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json({ message: "Room deleted" });
};