import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
  },
  category: {
    type: String,
    required: true,
    enum: ['Food & Beverage', 'Housekeeping', 'Maintenance', 'Office Supplies', 'Other'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  statusReason: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true,
});

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
