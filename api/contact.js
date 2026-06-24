// api/contact.js
// Serverless function: receives contact form submissions and emails them to the site owner via Gmail.
const nodemailer = require('nodemailer');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async (req, res) => {
  // CORS (same-origin in production, but harmless to allow during dev/testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, message, company } = req.body || {};

    // Honeypot: real users never fill this hidden field. Bots often do.
    if (company) {
      return res.status(200).json({ ok: true }); // silently accept, do nothing
    }

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    if (String(name).length > 200 || String(message).length > 5000) {
      return res.status(400).json({ error: 'Input too long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const CONTACT_TO = process.env.CONTACT_TO_EMAIL || GMAIL_USER;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars');
      return res.status(500).json({ error: 'Email service is not configured.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    await transporter.sendMail({
      from: `"Portfolio Contact Form" <${GMAIL_USER}>`,
      to: CONTACT_TO,
      replyTo: email,
      subject: `New portfolio message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px;">
          <h2 style="margin-bottom: 4px;">New message from your portfolio</h2>
          <p style="color:#555; margin-top:0;">Sent via the contact form</p>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Message:</strong></p>
          <p style="background:#f5f5f5; padding:12px 16px; border-radius:8px;">${safeMessage}</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong sending your message. Please try again or email directly.' });
  }
};
