/**
 * Verify password against database hash directly
 * Usage: node scripts/verify-db-password.js <username> <password>
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../lib/db');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.log('Usage: node scripts/verify-db-password.js <username> <password>');
    process.exit(1);
}

async function verifyPassword() {
    try {
        console.log(`Verifying password for: ${username}`);
        console.log(`Password: ${password}`);
        console.log(`Password length: ${password.length}`);
        console.log(`Password bytes:`, Buffer.from(password).toString('hex'));
        console.log('');
        
        // Get user from database
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            console.log('❌ User not found');
            process.exit(1);
        }
        
        const user = result.rows[0];
        console.log('✅ User found');
        console.log(`   Username: ${user.username}`);
        console.log(`   Hash: ${user.password_hash}`);
        console.log(`   Hash length: ${user.password_hash.length}`);
        console.log('');
        
        // Test password comparison
        console.log('Testing bcrypt.compare...');
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        console.log('');
        if (isValid) {
            console.log('✅ Password is VALID!');
        } else {
            console.log('❌ Password is INVALID');
            console.log('');
            console.log('Troubleshooting:');
            console.log('1. Check if password has extra spaces');
            console.log('2. Check if special characters are encoded correctly');
            console.log('3. Try resetting the password using: npm run reset-password');
        }
        
        // Also test with trimmed password
        console.log('');
        console.log('Testing with trimmed password...');
        const trimmedPassword = password.trim();
        if (trimmedPassword !== password) {
            console.log(`   Original length: ${password.length}`);
            console.log(`   Trimmed length: ${trimmedPassword.length}`);
            const isValidTrimmed = await bcrypt.compare(trimmedPassword, user.password_hash);
            console.log(`   Trimmed password valid: ${isValidTrimmed}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

verifyPassword().then(() => {
    db.close();
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    db.close();
    process.exit(1);
});

