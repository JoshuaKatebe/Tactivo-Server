require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns');

// Force IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

console.log('Testing connection to:', process.env.DB_HOST);
if (process.env.DB_HOST) {
    console.log('Host length:', process.env.DB_HOST.length);
    console.log('Host char codes:', process.env.DB_HOST.split('').map(c => c.charCodeAt(0)));
}

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        await client.connect();
        console.log('✅ Connected successfully!');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('📊 Tables found:', res.rows.map(r => r.table_name).join(', '));
        await client.end();
    } catch (err) {
        console.error('❌ Query failed:', err);
    }
}

test();
