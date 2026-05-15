import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sku: {
    type: String,
    unique: true,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Housekeeping', 'Kitchen & Restaurant', 'Maintenance', 'Bar', 'Furniture & Equipment', 'Office Supplies', 'Other'],
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    required: true, // e.g., 'kg', 'pcs', 'liters'
    default: 'pcs',
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 10,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  price: {
    type: Number,
    default: 0,
  },
  expiryDate: {
    type: Date,
  },
  warrantyInfo: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock'],
    default: 'in-stock',
  },
  imageUrl: {
    type: String,
  }
}, {
  timestamps: true,
});

// Middleware to update status based on quantity and reorderLevel
inventorySchema.pre('save', function(next) {
  if (this.quantity === 0) {
    this.status = 'out-of-stock';
  } else if (this.quantity <= this.reorderLevel) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
  next();
});

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;
