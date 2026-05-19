const { Pool } = require('pg');
require('dotenv').config();

const appPool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

async function updateDB() {
    try {
        console.log(`Connecting to application database '${process.env.PGDATABASE}' to alter tables...`);
        
        // Add email column
        await appPool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
            ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS reset_token_expires BIGINT;
        `);

        console.log("Table 'users' altered successfully. NOTE: Existing users will have a NULL email, which might cause issues. Please update them manually or drop and recreate the DB if you want strict NOT NULL enforcement.");
        process.exit(0);

    } catch (err) {
        console.error("Database update failed:", err);
        process.exit(1);
    }
}

updateDB();
