// api/resume-upload.js
// Serverless function: lets the site owner upload a new resume PDF, protected by a password.
// Stores the file in Vercel Blob (production) or local uploads/ directory (local dev).
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD env var is not set');
      return res.status(500).json({ error: 'Admin upload is not configured.' });
    }

    const providedPassword = req.headers['x-admin-password'];
    if (!providedPassword || providedPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Incorrect admin password.' });
    }

    // Body is expected to be raw PDF bytes (frontend sends the file directly).
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    if (!fileBuffer.length) {
      return res.status(400).json({ error: 'No file received.' });
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB).' });
    }

    const contentType = req.headers['content-type'] || 'application/pdf';
    if (!contentType.includes('pdf')) {
      return res.status(400).json({ error: 'Only PDF files are accepted.' });
    }

    let url;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = require('@vercel/blob');
      const blob = await put('resume/current-resume.pdf', fileBuffer, {
        access: 'public',
        contentType: 'application/pdf',
        allowOverwrite: true,
        addRandomSuffix: false,
      });
      url = blob.url;
    } else {
      // Local dev fallback: save to uploads/ directory and serve via the dev server.
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, 'current-resume.pdf'), fileBuffer);
      url = '/uploads/current-resume.pdf';
    }

    return res.status(200).json({ ok: true, url, uploadedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Resume upload error:', err);
    return res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
