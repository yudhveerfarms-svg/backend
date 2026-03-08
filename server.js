require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Adjust to match your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Mock Database
const products = {
    dairy: [
        {
            id: 1,
            name: "Traditional Bilona A2 Desi Ghee",
            type: "Dairy Product",
            weight: "1 Kg",
            description: "Authentic traditional ghee made from A2 desi cow milk using the bilona method.",
            image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            // price: "₹1,200"
        },
        {
            id: 2,
            name: "Stone-Ground Aata",
            type: "Flour",
            weight: "1 Kg",
            description: "Finely stone-ground whole wheat flour, preserving nutrients and natural taste.",
            image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            // price: "₹80"
        },
        {
            id: 3,
            name: "Premium Quality Natural Honey",
            type: "Honey",
            weight: "500g",
            description: "Raw, unprocessed honey sourced from organic farms, rich in natural enzymes.",
            image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            // price: "₹250"
        },
        {
            id: 4,
            name: "Cold-Pressed Mustard Oil",
            type: "Oil",
            weight: "1 Litre",
            description: "Pure cold-pressed mustard oil, extracted without heat to retain health benefits.",
            image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            // price: "₹180"
        }
    ]
};

// Routes
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    // Process the data (save to DB, send email, etc.)
    console.log('Contact form submission:', { name, email, message });
    // Configure the nodemailer transporter
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER,
        subject: `New Contact Form Submission from ${name}`,
        html: `
  <div style="background:#f4f6f8;padding:40px;font-family:Arial">
    <table width="600" align="center" style="background:white;padding:30px;border-radius:8px">

      <tr>
        <td style="background:#1f2937;color:white;padding:15px;text-align:center">
          <h2 style="margin:0;">Yudhveer Farms</h2>
          <p style="margin:0;color:#f97316">New Contact Form Submission</p>
        </td>
      </tr>

      <tr>
        <td style="padding-top:20px;font-size:15px;color:#333">
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Message:</b></p>
          <div style="background:#f9fafb;padding:15px;border-radius:5px">
            ${message}
          </div>
        </td>
      </tr>

      <tr>
        <td style="text-align:center;padding-top:20px">
          <a href="mailto:${email}" 
          style="background:#f97316;color:white;padding:10px 18px;text-decoration:none;border-radius:5px">
          Reply
          </a>
        </td>
      </tr>

    </table>
  </div>
  `
    };
    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.status(500).json({ message: 'Error processing your request', error: error.toString() });
        } else {
            res.status(200).json({ message: 'Message received and email sent successfully' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
