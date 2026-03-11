require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const app = express();
// Connect to database
connectDB();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://yudhveerfarms.com',
  'http://yudhveerfarms.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/api/products', async (req, res) => {
  try {
    const productsList = await Product.find({});
    res.json({ dairy: productsList }); // Kept the { dairy: [] } wrapper to match frontend expected structure initially, or just send array if frontend allows.
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching products' });
  }
});
app.get('/api/test', async (req, res) => {
  res.json({ message: 'Test endpoint is working!' });
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
