// api/resume-info.js
// Public serverless function: returns metadata (URL) for the current resume so visitors can download it.
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { list } = require('@vercel/blob');
      const { blobs } = await list({ prefix: 'resume/current-resume.pdf' });
      if (!blobs || blobs.length === 0) {
        return res.status(200).json({ available: false });
      }
      const resume = blobs[0];
      return res.status(200).json({
        available: true,
        url: resume.url,
        uploadedAt: resume.uploadedAt,
        size: resume.size,
      });
    }

    // Local dev fallback: check uploads/ directory.
    const localPath = path.join(__dirname, '..', 'uploads', 'current-resume.pdf');
    if (!fs.existsSync(localPath)) {
      return res.status(200).json({ available: false });
    }
    const stat = fs.statSync(localPath);
    return res.status(200).json({
      available: true,
      url: '/uploads/current-resume.pdf',
      uploadedAt: stat.mtime.toISOString(),
      size: stat.size,
    });
  } catch (err) {
    console.error('Resume info error:', err);
    return res.status(200).json({ available: false });
  }
};
