const nodemailer = require('nodemailer');
const { AppError } = require('../utils/AppError');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new AppError('Email service is not configured', 503, { code: 'EMAIL_CONFIG' });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendContactEmail({ name, email, message }) {
  const transporter = createTransporter();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER,
    subject: `New Contact Form Submission from ${name}`,
    html: `
  <div style="background:#f4f6f8;padding:40px;font-family:Arial,sans-serif">
    <table width="600" align="center" style="background:white;padding:30px;border-radius:8px">

      <tr>
        <td style="background:#1f2937;color:white;padding:15px;text-align:center">
          <h2 style="margin:0;">Yudhveer Farms</h2>
          <p style="margin:0;color:#f97316">New Contact Form Submission</p>
        </td>
      </tr>

      <tr>
        <td style="padding-top:20px;font-size:15px;color:#333">
          <p><b>Name:</b> ${safeName}</p>
          <p><b>Email:</b> ${safeEmail}</p>
          <p><b>Message:</b></p>
          <div style="background:#f9fafb;padding:15px;border-radius:5px;white-space:pre-wrap">${safeMessage}</div>
        </td>
      </tr>

      <tr>
        <td style="text-align:center;padding-top:20px">
          <a href="mailto:${safeEmail}"
          style="background:#f97316;color:white;padding:10px 18px;text-decoration:none;border-radius:5px">
          Reply
          </a>
        </td>
      </tr>

    </table>
  </div>
  `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendContactEmail };
