const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define a schema and model
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Email validation function
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Function to verify email using ZeroBounce API
async function isValidEmail(email) {
    const apiKey = '668ac889d6b740ec84fc51801c7afb5d';
    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${email}`;

    try {
        const response = await axios.get(url);
        const result = response.data;
        return result.status === 'valid';
    } catch (error) {
        console.error('Error verifying email:', error);
        return false;
    }
}

// API endpoint to handle sign-up requests
app.post('/submit-data', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Invalid data');
    }

    if (!isValidEmailFormat(email)) {
        return res.status(400).send('Invalid email format');
    }

    const emailIsActive = await isValidEmail(email);
    if (!emailIsActive) {
        return res.status(400).send('Email is not active');
    }

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).send('Email already registered');
        } else {
            user = new User({
                email,
                password,
            });
            await user.save();
            res.send('User registered successfully');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Database error');
    }
});

// API endpoint to handle sign-in requests
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Invalid data');
    }

    if (!isValidEmailFormat(email)) {
        return res.status(400).send('Invalid email format');
    }

    try {
        let user = await User.findOne({ email });

        if (!user || user.password !== password) {
            return res.status(400).send('Invalid email or password');
        } else {
            res.send('Sign-in successful');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Database error');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
