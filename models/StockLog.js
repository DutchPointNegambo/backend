import mongoose from 'mongoose';

const stockLogSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changeType: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  previousQuantity: {
    type: Number,
    required: true,
  },
  newQuantity: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  unitCost: {
    type: Number,
    default: 0
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  }
}, {
  timestamps: true,
});

const StockLog = mongoose.model('StockLog', stockLogSchema);

export default StockLog;
