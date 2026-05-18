const { Pool } = require('pg');
require('dotenv').config();

// Create a pool to connect to the default 'postgres' database first to create our app database if needed
const initPool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    database: 'postgres' // connect to default database to create new one
});

const appPool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

async function initializeDB() {
    try {
        console.log(`Ensuring database '${process.env.PGDATABASE}' exists...`);
        const res = await initPool.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${process.env.PGDATABASE}'`);
        
        if (res.rowCount === 0) {
            console.log(`Database '${process.env.PGDATABASE}' not found, creating it...`);
            await initPool.query(`CREATE DATABASE "${process.env.PGDATABASE}"`);
            console.log("Database created successfully.");
        } else {
            console.log("Database already exists.");
        }
        await initPool.end();

        console.log("Connecting to application database to create tables...");
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
