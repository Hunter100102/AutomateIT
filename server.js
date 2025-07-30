const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(cors({
  origin: ['https://automatingsolutions.com', 'https://hunter100102.github.io'],
  optionsSuccessStatus: 200
}));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

app.post('/send-email', (req, res) => {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const { name, email, message } = req.body;

  const msg = {
    to: 'william@automatingsolutions.com',
    from: 'spc.cody.hunter@gmail.com',
    subject: 'New Contact Form Submission',
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
  };

  sgMail.send(msg)
    .then(() => res.status(200).json({ message: 'Email sent successfully' }))
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Failed to send email' });
    });
});

// Smart Analyzer Route
app.post('/api/analyze-data', upload.single('datafile'), (req, res) => {
  const filePath = req.file.path;
  const py = spawn('python3', ['analyze.py', filePath]);

  let result = '';
  py.stdout.on('data', data => result += data.toString());
  py.stderr.on('data', err => console.error('Python error:', err.toString()));

  py.on('close', () => {
    try {
      const [insightsPart, chartTablePart] = result.split('---chart---');
      const [chartPart, tablePart] = chartTablePart.split('---table---');

      res.json({
        insights: insightsPart.trim(),
        chart: chartPart.trim(),
        table: tablePart.trim()
      });
    } catch (err) {
      console.error('Parsing error:', err);
      res.status(500).json({ message: 'Failed to parse Python output' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
