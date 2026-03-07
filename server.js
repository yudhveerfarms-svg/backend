const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mock Database
const products = {
    cows: [
        {
            id: 1,
            name: "HF Cow - Champion Lineage",
            breed: "Holstein Friesian",
            yield: "35-40 Liters/Day",
            description: "High-quality, disease-free HF cow with exceptional milk capacity.",
            image: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800",
            price: "₹85,000"
        },
        {
            id: 2,
            name: "HF Heifer - Premium Grade",
            breed: "Holstein Friesian",
            yield: "Expected 30+ Liters/Day",
            description: "Young premium HF heifer from top genetics.",
            image: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800",
            price: "₹65,000"
        },
        {
            id: 3,
            name: "HF Cow - High Yield",
            breed: "Holstein Friesian",
            yield: "40+ Liters/Day",
            description: "Exceptional milk yield HF cow, perfect for commercial dairy.",
            image: "https://images.unsplash.com/photo-1595180630730-81f14b6058fb?auto=format&fit=crop&q=80&w=800",
            price: "₹95,000"
        }
    ],
    dairy: [
        {
            id: 4,
            name: "Pure Organic A2 Ghee",
            type: "Dairy Product",
            weight: "1 Kg",
            description: "100% pure organic ghee made using the traditional bilona method.",
            image: "/images/a2_ghee_jar.png",
            price: "₹1,200"
        }
    ]
};

// Routes
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
