/**
 * Reset a user's password in the database
 * Usage: node scripts/reset-user-password.js <username> <new_password>
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../lib/db');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.log('Usage: node scripts/reset-user-password.js <username> <new_password>');
    process.exit(1);
}

async function resetPassword() {
    try {
        console.log(`Resetting password for user: ${username}`);
        console.log('');
        
        // Check if user exists
        const userResult = await db.query('SELECT id, username FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            process.exit(1);
        }
        
        const user = userResult.rows[0];
        console.log(`Found user: ${user.username} (ID: ${user.id})`);
        console.log('');
        
        // Generate new hash
        console.log('Generating new password hash...');
        const password_hash = await bcrypt.hash(newPassword, 10);
        console.log(`New hash: ${password_hash.substring(0, 30)}...`);
        console.log('');
        
        // Update database
        console.log('Updating database...');
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
            [password_hash, user.id]
        );
        
        console.log('✅ Password updated successfully!');
        console.log('');
        console.log('You can now login with:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${newPassword}`);
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

resetPassword().then(() => {
    db.close();
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    db.close();
    process.exit(1);
});

