require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

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
const basePath = process.env.BASE_URI || '';

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect(basePath + '/login');
};

// Pass user info and baseUrl to views
app.use((req, res, next) => {
    res.locals.user = req.session.username || null;
    res.locals.error = null;
    res.locals.baseUrl = basePath;
    next();
});

// --- Routes ---
const router = express.Router();

// Redirect root to dashboard or login
router.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect(basePath + '/dashboard');
    } else {
        res.redirect(basePath + '/login');
    }
});

// Register
router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect(basePath + '/dashboard');
    res.render('register');
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userExists.rows.length > 0) {
            return res.render('register', { error: 'Username or email already taken.' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Save user
        await db.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, hashedPassword]);

        res.redirect(basePath + '/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Server error during registration.' });
    }
});

// Login
router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect(basePath + '/dashboard');
    res.render('login');
});

router.post('/login', async (req, res) => {
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

            res.redirect(basePath + '/dashboard');
        } else {
            res.render('login', { error: 'Invalid username or password.' });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error during login.' });
    }
});

// Forgot Password
router.get('/forgot-password', (req, res) => {
    if (req.session.userId) return res.redirect(basePath + '/dashboard');
    res.render('forgot-password');
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if user exists
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            // Do not reveal if email exists or not
            return res.render('login', { error: 'If the email exists, a reset link has been sent.' });
        }

        const user = result.rows[0];

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = Date.now() + 3600000; // 1 hour

        // Save token to db
        await db.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [resetToken, tokenExpires, user.id]);

        // Send email
        const resetUrl = `http://${req.headers.host}${basePath}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@masukaja.com',
            to: email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the following link to reset your password: \n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
        };

        await transporter.sendMail(mailOptions);

        res.render('login', { error: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
        console.error(err);
        res.render('forgot-password', { error: 'Server error during password reset request.' });
    }
});

// Reset Password
router.get('/reset-password', (req, res) => {
    if (req.session.userId) return res.redirect(basePath + '/dashboard');
    const { token } = req.query;
    if (!token) return res.redirect(basePath + '/login');
    res.render('reset-password', { token });
});

router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > $2', [token, Date.now()]);
        if (result.rows.length === 0) {
            return res.render('login', { error: 'Password reset token is invalid or has expired.' });
        }
        
        const user = result.rows[0];

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear token
        await db.query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [hashedPassword, user.id]);

        res.render('login', { error: 'Password reset successful! Please log in.' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error during password reset.' });
    }
});

// Dashboard (Protected)
router.get('/dashboard', requireAuth, async (req, res) => {
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
router.post('/passwords/add', requireAuth, async (req, res) => {
    const { appName, appUsername, appPassword } = req.body;
    try {
        await db.query(
            'INSERT INTO stored_passwords (user_id, app_name, app_username, app_password) VALUES ($1, $2, $3, $4)',
            [req.session.userId, appName, appUsername, appPassword]
        );
        res.redirect(basePath + '/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Delete Password
router.post('/passwords/delete/:id', requireAuth, async (req, res) => {
    try {
        await db.query('DELETE FROM stored_passwords WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
        res.redirect(basePath + '/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect(basePath + '/login');
    });
});

// Mount the router on the root, but handle Passenger subfolder paths by using a wildcard fallback
app.use('/', router);
if (basePath) {
    app.use(basePath, router);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
