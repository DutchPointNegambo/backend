import Supplier from '../models/Supplier.js';

// @desc    Get all suppliers
// @route   GET /api/inventory/suppliers
// @access  Private/Admin
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a supplier
// @route   POST /api/inventory/suppliers
// @access  Private/Admin
export const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, category } = req.body;
    
    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      category
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a supplier
// @route   PUT /api/inventory/suppliers/:id
// @access  Private/Admin
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (supplier) {
      supplier.name = req.body.name || supplier.name;
      supplier.contactPerson = req.body.contactPerson || supplier.contactPerson;
      supplier.phone = req.body.phone || supplier.phone;
      supplier.email = req.body.email || supplier.email;
      supplier.address = req.body.address || supplier.address;
      supplier.category = req.body.category || supplier.category;
      supplier.status = req.body.status || supplier.status;

      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/inventory/suppliers/:id
// @access  Private/Admin
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (supplier) {
      await supplier.deleteOne();
      res.json({ message: 'Supplier removed' });
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
