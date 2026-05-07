import Food from '../models/Food.js';

// @desc    Get all foods
// @route   GET /api/foods
// @access  Public
export const getFoods = async (req, res) => {
    try {
        const foods = await Food.find({});
        res.json(foods);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a food
// @route   POST /api/foods
// @access  Private/Admin
export const createFood = async (req, res) => {
    try {
        const { name, description, category, price, status, image, rating, prepTime } = req.body;

        const food = new Food({
            name,
            description,
            category,
            price,
            status,
            image,
            rating,
            prepTime
        });

        const createdFood = await food.save();
        res.status(201).json(createdFood);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a food
// @route   PUT /api/foods/:id
// @access  Private/Admin
export const updateFood = async (req, res) => {
    try {
        const { name, description, category, price, status, image, rating, prepTime } = req.body;

        const food = await Food.findById(req.params.id);

        if (food) {
            food.name = name || food.name;
            food.description = description !== undefined ? description : food.description;
            food.category = category || food.category;
            food.price = price || food.price;
            food.status = status || food.status;
            food.image = image !== undefined ? image : food.image;
            food.rating = rating || food.rating;
            food.prepTime = prepTime || food.prepTime;

            const updatedFood = await food.save();
            res.json(updatedFood);
        } else {
            res.status(404).json({ message: 'Food item not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a food
// @route   DELETE /api/foods/:id
// @access  Private/Admin
export const deleteFood = async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);

        if (food) {
            await food.deleteOne();
            res.json({ message: 'Food item removed' });
        } else {
            res.status(404).json({ message: 'Food item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
