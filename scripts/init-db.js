const { Pool } = require('pg');
require('dotenv').config();

const appPool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

async function initializeDB() {
    try {
        console.log(`Connecting to application database '${process.env.PGDATABASE}' to create tables...`);
        // Create tables
        await appPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await appPool.query(`
            CREATE TABLE IF NOT EXISTS stored_passwords (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                app_name VARCHAR(100) NOT NULL,
                app_username VARCHAR(100) NOT NULL,
                app_password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Tables 'users' and 'stored_passwords' initialized successfully.");
        process.exit(0);

    } catch (err) {
        console.error("Database initialization failed:", err);
        process.exit(1);
    }
}

initializeDB();
