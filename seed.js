require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

// Mock Database
const products = [
    {
        name: "Traditional Bilona A2 Desi Ghee",
        type: "Dairy Product",
        weight: "1 Kg",
        price: 1299,
        description: "Authentic traditional ghee made from A2 desi cow milk using the bilona method.",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    },
    {
        name: "Stone-Ground Aata",
        type: "Flour",
        weight: "1 Kg",
        price: 430,
        description: "Finely stone-ground whole wheat flour, preserving nutrients and natural taste.",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    },
    {
        name: "Premium Quality Natural Honey",
        type: "Honey",
        weight: "500g",
        price: 399,
        description: "Raw, unprocessed honey sourced from organic farms, rich in natural enzymes.",
        image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    },
    {
        name: "Cold-Pressed Mustard Oil",
        type: "Oil",
        weight: "1 Litre",
        price: 299,
        description: "Pure cold-pressed mustard oil, extracted without heat to retain health benefits.",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    }
];

const importData = async () => {
    try {
        await connectDB();

        await Product.deleteMany();

        await Product.insertMany(products);

        console.log('Data Imported successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

importData();
