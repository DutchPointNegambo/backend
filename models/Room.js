import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
     name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['deluxe', 'presidential', 'ocean', 'villa', 'family', 'honeymoon'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  description: {
    type: String,
    required: true,
  },
  features: [{
    type: String,
  }],
  image: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available',
  },
  view: {
    type: String,
    default: 'ocean',
  },
}, {
  timestamps: true,
})

const Room = mongoose.model('Room', roomSchema)

export default Room
