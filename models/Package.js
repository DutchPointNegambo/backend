import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  groupSize: {
    min: { type: Number, required: true }, // e.g. 10
    max: { type: Number }, // optional
  },

  type: {
    type: String,
    required: true,
    enum: ['family', 'team'],
  },

  pricePerPerson: {
    type: Number,
    required: true,
    min: 0,
  },

  time: {
    start: { type: String, required: true }, // "10:00 AM"
    end: { type: String, required: true },   // "7:00 PM"
  },

  facilities: [
    {
      type: String, // changing room, beach access, etc.
    }
  ],

  meals: {
    welcomeDrink: { type: Boolean, default: false },

    lunch: {
      type: {
        type: String, // buffet / set menu
        default: "buffet",
      },
      items: [String],
    },

    eveningTea: {
      enabled: { type: Boolean, default: false },
      items: [String], // tea, coffee, cake
    },

    dessert: [String],
  },

  specialOffers: [
    {
      title: String,
      description: String,
    }
  ],

  description: {
    type: String,
  },

  locationFeatures: [
    String // beach access, rooftop view
  ],

  images: [String],

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  }

}, {
  timestamps: true,
});

const Package = mongoose.model('Package', packageSchema);

export default Package;