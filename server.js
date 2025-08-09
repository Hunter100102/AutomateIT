// server.js
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ---- Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: ['https://automatingsolutions.com', 'https://hunter100102.github.io'],
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
      to: 'william@automateingsolutions.com', // change if needed
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

// ---- Smart Analyzer route (xlsx -> Python)
const upload = multer({ dest: 'uploads/' });

app.post('/api/analyze-data', upload.single('datafile'), (req, res) => {
  if (!req?.file?.path) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const py = spawn('python3', ['-u', 'analyze.py', filePath]);

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (d) => { stdout += d.toString(); });
  py.stderr.on('data', (e) => { stderr += e.toString(); });

  py.on('close', (code) => {
    try {
      if (code !== 0) {
        console.error('Python exited with code', code, stderr || '(no stderr)');
        return res.status(500).json({ message: 'Python error', details: stderr || '' });
      }

      if (!stdout || !stdout.includes('---chart---') || !stdout.includes('---table---')) {
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
    } catch (err) {
      console.error('Parsing error:', err);
      return res.status(500).json({ message: 'Failed to parse Python output' });
    }
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
