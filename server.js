const express = require('express');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Enable CORS for all origins (replace * with your GitHub Pages URL if needed)
app.use(cors());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    const msg = {
        to: 'spc.cody.hunter@gmail.com', // Your email address
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
