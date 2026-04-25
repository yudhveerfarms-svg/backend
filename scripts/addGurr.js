require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

async function addGurr() {
  await connectDB();
  
  const existing = await Product.findOne({
    $or: [
      { name: { $regex: /gur/i } },
      { name: { $regex: /jaggery/i } }
    ]
  });

  if (!existing) {
    console.log("Gurr not found. Creating...");
    const gurr = new Product({
      name: "Organic Desi Gur (Jaggery)",
      description: "Naturally processed organic jaggery made from pure sugarcane juice. Rich in minerals, chemical-free, and full of traditional sweetness.",
      category: "Pantry",
      type: "Pantry",
      weight: "1 Kg",
      price: 250,
      discount: 0,
      sku: "organic-desi-gur-jaggery-default",
      status: "public",
      images: ["/images/gurmain.jpeg", "/images/gurr2.jpeg", "/images/gurr3.jpeg", "/images/gurr4.jpeg"],
      variants: [
        { size: "500g", price: 250, stock: 10, sku: "" },
        { size: "1kg", price: 500, stock: 10, sku: "" },
        { size: "5kg", price: 2500, stock: 10, sku: "" }
      ]
    });
    await gurr.save();
    console.log("Gurr created successfully.");
  } else {
    console.log("Gurr already exists. Ensuring it's public...");
    existing.status = 'public';
    await existing.save();
  }
  
  process.exit(0);
}

addGurr().catch(err => {
  console.error("Error adding Gurr:", err);
  process.exit(1);
});
