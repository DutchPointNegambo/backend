import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Food from './models/Food.js';
import connectDB from './config/database.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const foods = [
  {
    name: "Gourmet Sri Lankan Fish Curry",
    description: "A traditional Negombo style fish curry prepared with fresh catch of the day, infused with authentic spices and served with fragrant basmati rice and accompaniments.",
    category: "Signature Dishes & Global Cuisine",
    price: 1350,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1776872599/Gourmet_Sri_Lankan_Fish_Curry_cxja9d.jpg",
    rating: 5,
    prepTime: "25-30 min"
  },
  {
    name: "Premium Seafood Platter",
    description: "An indulgent selection of grilled lobster, jumbo prawns, calamari, and lagoon crabs, served with garlic herb butter and seasonal roasted vegetables.",
    category: "Signature Dishes & Global Cuisine",
    price: 2800,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1776872600/Premium_Seafood_Platter_ldy2zp.jpg",
    rating: 5,
    prepTime: "35-40 min"
  },
  {
    name: "Luxury Tropical Breakfast",
    description: "A decadent start to your day featuring exotic seasonal fruits, artisanal pastries, avocado on sourdough with poached eggs, and fresh premium coffee.",
    category: "Signature Dishes & Global Cuisine",
    price: 1100,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1776872599/Luxury_Tropical_Breakfast_syatxr.jpg",
    rating: 4.8,
    prepTime: "15-20 min"
  },
  {
    name: "Chicken Fried Rice",
    description: "A classic Sri Lankan favorite — wok-tossed basmati rice stir-fried with tender chicken pieces, fresh vegetables, scrambled egg, and a blend of aromatic soy and chili seasoning.",
    category: "Fried Rice — Sri Lankan Style",
    price: 1100,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777981767/Chicken_Fried_Rice_fabdjb.jpg",
    rating: 4.9,
    prepTime: "15-20 min"
  },
  {
    name: "Seafood Fried Rice",
    description: "A coastal delight loaded with prawns, calamari, and crab meat, tossed with fragrant rice, crispy vegetables, and a hint of garlic butter and lime.",
    category: "Fried Rice — Sri Lankan Style",
    price: 1300,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777981769/Seafood_Fried_Rice_rd89ns.jpg",
    rating: 5,
    prepTime: "20-25 min"
  },
  {
    name: "Egg Fried Rice",
    description: "Simple yet delicious — fluffy basmati rice wok-fried with scrambled eggs, spring onions, and a touch of sesame oil, served with a side of chili paste.",
    category: "Fried Rice — Sri Lankan Style",
    price: 850,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777981767/Egg_Fried_Rice_hkacpq.jpg",
    rating: 4.7,
    prepTime: "10-15 min"
  },
  {
    name: "Vegetable Fried Rice",
    description: "A vibrant and healthy option featuring seasonal garden vegetables, tofu, and cashew nuts stir-fried with fragrant rice and traditional Sri Lankan spices.",
    category: "Fried Rice — Sri Lankan Style",
    price: 800,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777981768/Vegetable_Fried_Rice_cvmee1.jpg",
    rating: 4.6,
    prepTime: "10-15 min"
  },
  {
    name: "Prawn Fried Rice",
    description: "Succulent jumbo prawns stir-fried with aromatic rice, bell peppers, leeks, and a special house blend sauce that gives it a signature smoky flavor.",
    category: "Fried Rice — Sri Lankan Style",
    price: 1250,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777981767/Prawn_Fried_Rice_tekrqe.jpg",
    rating: 4.9,
    prepTime: "15-20 min"
  },
  {
    name: "Mixed Fried Rice",
    description: "The ultimate Sri Lankan fried rice experience — chicken, prawns, and egg combined with crispy vegetables, fried chillies, and our chef's secret seasoning.",
    category: "Fried Rice — Sri Lankan Style",
    price: 1300,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777981766/Mixed_Fried_Rice_tdaqjh.jpg",
    rating: 5,
    prepTime: "20-25 min"
  },
  {
    name: "Chicken Kottu",
    description: "Shredded godamba roti chopped on the hot griddle with spiced chicken, leeks, eggs, and a rich curry sauce — the rhythmic sound and smoky aroma make this a true Sri Lankan experience.",
    category: "Kottu — Sri Lanka's Iconic Street Food",
    price: 950,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777982172/Chicken_Kottu_ne2ufk.jpg",
    rating: 5,
    prepTime: "15-20 min"
  },
  {
    name: "Cheese Kottu",
    description: "A modern twist on the classic — crispy roti strips stir-chopped with chicken, vegetables, and generously topped with melted mozzarella cheese and a creamy curry gravy.",
    category: "Kottu — Sri Lanka's Iconic Street Food",
    price: 1100,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777982171/Cheese_Kottu_ragrnr.jpg",
    rating: 4.9,
    prepTime: "15-20 min"
  },
  {
    name: "Seafood Kottu",
    description: "Fresh prawns, calamari, and fish pieces chopped with godamba roti, seasoned vegetables, and a spicy coastal curry sauce — a Negombo specialty.",
    category: "Kottu — Sri Lanka's Iconic Street Food",
    price: 1200,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777982171/Seafood_Kottu_iwkjop.jpg",
    rating: 5,
    prepTime: "20-25 min"
  },
  {
    name: "Egg Kottu",
    description: "A budget-friendly favorite — shredded roti chopped with scrambled eggs, onions, green chillies, and curry leaves, served with a side of spicy pol sambol.",
    category: "Kottu — Sri Lanka's Iconic Street Food",
    price: 750,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777982171/Egg_Kottu_mytssx.jpg",
    rating: 4.7,
    prepTime: "10-15 min"
  },
  {
    name: "Vegetable Kottu",
    description: "A wholesome vegetarian delight — godamba roti chopped with fresh cabbage, carrots, leeks, green beans, and a mild yet flavorful vegetable curry sauce.",
    category: "Kottu — Sri Lanka's Iconic Street Food",
    price: 700,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777982172/Vegetable_Kottu_vyaj6h.jpg",
    rating: 4.6,
    prepTime: "10-15 min"
  },
  {
    name: "Mixed Kottu",
    description: "The chef's special — a generous combination of chicken, prawns, and egg with shredded roti, stir-chopped with aromatic spices and topped with crispy onions.",
    category: "Kottu — Sri Lanka's Iconic Street Food",
    price: 1150,
    status: "Available",
    image: "https://res.cloudinary.com/dztzaoo6r/image/upload/v1777982172/Mixed_Kottu_xuqwbz.jpg",
    rating: 5,
    prepTime: "20-25 min"
  }
];

const seedDB = async () => {
    try {
        await connectDB();
        console.log('Connected to DB via seedDB function');
        
        await Food.deleteMany();
        console.log('Old food items cleared.');
        
        await Food.insertMany(foods);
        console.log('15 food items seeded successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('Error with data import:', error);
        process.exit(1);
    }
};

seedDB();
