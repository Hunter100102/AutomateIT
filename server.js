// server.js
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ---- Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: [
    'https://automatingsolutions.com',
    'https://hunter100102.github.io',
    'http://localhost:3000',
    'http://localhost:5500'
  ],
  optionsSuccessStatus: 200
}));

// Static (optional if you serve assets)
app.use(express.static(path.join(__dirname)));

// Health check for Render
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// ---- Email route (SendGrid)
app.post('/api/send-email', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ message: 'Missing SENDGRID_API_KEY' });
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const { name, email, message } = req.body || {};
    const msg = {
      to: 'william@automateingsolutions.com', // keep if this is intentional
      from: 'spc.cody.hunter@gmail.com',
      subject: 'New Contact Form Submission',
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    await sgMail.send(msg);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('SendGrid error:', error?.response?.body || error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

// ---- Smart Analyzer route (xlsx/csv -> Python)

// Disk storage that keeps/infers an extension; use /tmp for Render
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp'),
  filename: (req, file, cb) => {
    const origExt =
      path.extname(file.originalname) ||
      (file.mimetype === 'text/csv' ? '.csv' :
       file.mimetype === 'application/vnd.ms-excel' ? '.csv' :
       file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? '.xlsx' :
       '');
    const base =
      path.basename(file.originalname, path.extname(file.originalname))
        .replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload';
    cb(null, `${Date.now()}_${base}${origExt}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

app.post('/api/analyze-data', upload.single('datafile'), (req, res) => {
  if (!req?.file?.path) {
    return res.status(400).json({ message: "No file uploaded under field 'datafile'." });
  }

  const filePath = req.file.path;
  const pyBin = process.env.PYTHON_BIN || 'python3';
  const scriptPath = path.join(__dirname, 'analyze.py');

  const py = spawn(pyBin, ['-u', scriptPath, filePath], {
    env: { ...process.env, MPLBACKEND: 'Agg' }, // headless matplotlib
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (d) => { stdout += d.toString(); });
  py.stderr.on('data', (e) => { stderr += e.toString(); });

  const killTimer = setTimeout(() => {
    try { py.kill('SIGKILL'); } catch {}
  }, 30000); // 30s timeout

  py.on('close', (code) => {
    clearTimeout(killTimer);
    // Always clean up temp file
    try { fs.unlinkSync(filePath); } catch {}

    if (code !== 0) {
      console.error('Python exited with code', code, stderr || '(no stderr)');
      return res.status(400).json({ message: 'Python error', details: (stderr || '').slice(0, 2000) });
    }

    if (!stdout.includes('---chart---') || !stdout.includes('---table---')) {
      console.error('Malformed Python output:', stdout);
      return res.status(500).json({ message: 'Malformed analysis output' });
    }

    const [insightsPart, chartTablePart] = stdout.split('---chart---');
    const [chartPart, tablePart] = chartTablePart.split('---table---');

    return res.json({
      insights: (insightsPart || '').trim(),
      chart: (chartPart || '').trim(),
      table: (tablePart || '').trim()
    });
  });
});

// ---- Fallback route (optional)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---- Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
