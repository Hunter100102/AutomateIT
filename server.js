const express = require('express');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Enable CORS
const corsOptions = {
  origin: ['https://automatingsolutions.com', 'https://hunter100102.github.io'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    const msg = {
        to: 'william@automatingsolutions.com', // Your email address
        from: 'spc.cody.hunter@gmail.com', // Your verified sender email address
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    sgMail.send(msg)
        .then(() => {
            res.status(200).json({ message: 'Email sent successfully' });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ message: 'Failed to send email' });
        });
});

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const upload = multer({ dest: 'uploads/' });

// Serve automations.html (optional if you host it on GitHub Pages)
app.get('/automations', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'automations.html'));
});

// Route to handle file analysis
app.post('/api/analyze-data', upload.single('datafile'), (req, res) => {
    const filePath = req.file.path;

    const py = spawn('python3', ['analyze.py', filePath]);

    let result = '';
    py.stdout.on('data', (data) => result += data.toString());
    py.stderr.on('data', (err) => console.error('Python error:', err.toString()));

    py.on('close', () => {
        const [insights, chartBase64] = result.split('---chart---');
        res.json({ insights: insights.trim(), chart: chartBase64.trim() });
    });
});
