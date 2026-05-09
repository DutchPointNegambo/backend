import Inventory from '../models/Inventory.js';
import StockLog from '../models/StockLog.js';

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
export const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({}).populate('supplier', 'name');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an inventory item
// @route   POST /api/inventory
// @access  Private/Admin
export const createInventoryItem = async (req, res) => {
  try {
    const { name, sku, category, quantity, unit, reorderLevel, supplier, price } = req.body;

    const itemExists = await Inventory.findOne({ sku });
    if (itemExists) {
      return res.status(400).json({ message: 'Item with this SKU already exists' });
    }

    const item = await Inventory.create({
      name,
      sku,
      category,
      quantity,
      unit,
      reorderLevel,
      supplier,
      price
    });

    // Create an initial stock log if quantity > 0
    if (quantity > 0) {
      await StockLog.create({
        item: item._id,
        user: req.user._id,
        changeType: 'IN',
        quantity,
        previousQuantity: 0,
        newQuantity: quantity,
        reason: 'Initial Stock Creation',
        unitCost: price || 0,
        supplier: supplier || null
      });
    }

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Admin
export const updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (item) {
      item.name = req.body.name || item.name;
      item.sku = req.body.sku || item.sku;
      item.category = req.body.category || item.category;
      item.unit = req.body.unit || item.unit;
      item.reorderLevel = req.body.reorderLevel !== undefined ? req.body.reorderLevel : item.reorderLevel;
      item.supplier = req.body.supplier || item.supplier;
      item.price = req.body.price !== undefined ? req.body.price : item.price;

      const updatedItem = await item.save();
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Adjust stock level (IN/OUT)
// @route   POST /api/inventory/:id/adjust
// @access  Private
export const adjustStock = async (req, res) => {
  try {
    const { changeType, quantity, reason, unitCost } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const previousQuantity = item.quantity;
    let newQuantity;

    if (changeType === 'IN') {
      newQuantity = previousQuantity + Number(quantity);
      // Optionally update base price if new cost is provided
      if (unitCost) {
        item.price = unitCost;
      }
    } else if (changeType === 'OUT') {
      if (previousQuantity < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      newQuantity = previousQuantity - Number(quantity);
    } else {
      return res.status(400).json({ message: 'Invalid change type' });
    }

    item.quantity = newQuantity;
    await item.save();

    // Create log
    await StockLog.create({
      item: item._id,
      user: req.user._id,
      changeType,
      quantity,
      previousQuantity,
      newQuantity,
      reason,
      unitCost: changeType === 'IN' ? (unitCost || 0) : 0,
      supplier: changeType === 'IN' ? (req.body.supplier || item.supplier) : null
    });

    res.json({ message: 'Stock adjusted successfully', item });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (item) {
      await item.deleteOne();
      res.json({ message: 'Item removed' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stock logs for an item
// @route   GET /api/inventory/:id/logs
// @access  Private
export const getStockLogs = async (req, res) => {
  try {
    const logs = await StockLog.find({ item: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all stock logs (for global history/financials)
// @route   GET /api/inventory/logs/all
// @access  Private/Admin
export const getAllStockLogs = async (req, res) => {
  try {
    const logs = await StockLog.find({})
      .populate({
        path: 'item',
        select: 'name sku price supplier',
        populate: { path: 'supplier', select: 'name' }
      })
      .populate('user', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
