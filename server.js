require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using HTTPS
        httpOnly: true,
        maxAge: null // Session cookie by default
    }
}));

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Pass user info to views
app.use((req, res, next) => {
    res.locals.user = req.session.username || null;
    res.locals.error = null;
    next();
});

// --- Routes ---

// Redirect root to dashboard or login
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Register
app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.render('register', { error: 'Username already taken.' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Save user
        await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hashedPassword]);

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Server error during registration.' });
    }
});

// Login
app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password, rememberMe } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password_hash)) {
            // Login successful
            req.session.userId = user.id;
            req.session.username = user.username;

            // Handle Remember Me (Auto-Login)
            if (rememberMe === 'on') {
                // Set cookie to expire in 30 days
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
            } else {
                // Session cookie (expires when browser closes)
                req.session.cookie.expires = false;
            }

            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Invalid username or password.' });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error during login.' });
    }
});

// Dashboard (Protected)
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        // Fetch user's stored passwords
        const result = await db.query('SELECT * FROM stored_passwords WHERE user_id = $1 ORDER BY created_at DESC', [req.session.userId]);
        const passwords = result.rows;
        res.render('dashboard', { passwords });
    } catch (err) {
        console.error(err);
        res.render('dashboard', { passwords: [], error: 'Failed to load passwords.' });
    }
});

// Add Password
app.post('/passwords/add', requireAuth, async (req, res) => {
    const { appName, appUsername, appPassword } = req.body;
    try {
        await db.query(
            'INSERT INTO stored_passwords (user_id, app_name, app_username, app_password) VALUES ($1, $2, $3, $4)',
            [req.session.userId, appName, appUsername, appPassword]
        );
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Delete Password
app.post('/passwords/delete/:id', requireAuth, async (req, res) => {
    try {
        await db.query('DELETE FROM stored_passwords WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
