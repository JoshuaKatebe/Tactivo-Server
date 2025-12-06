/**
 * Test login against database
 * Usage: node scripts/test-login.js <username> <password>
 */

require('dotenv').config();
const userService = require('../services/user.service');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.log('Usage: node scripts/test-login.js <username> <password>');
    process.exit(1);
}

async function testLogin() {
    try {
        console.log(`Testing login for username: ${username}`);
        console.log('');
        
        // First, check if user exists
        const user = await userService.getByUsername(username);
        if (!user) {
            console.log('❌ User not found in database');
            return;
        }
        
        console.log('✅ User found:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Is Superuser: ${user.is_superuser}`);
        console.log(`   Password Hash: ${user.password_hash.substring(0, 30)}...`);
        console.log('');
        
        // Test password verification
        console.log('Testing password verification...');
        const result = await userService.verifyPassword(username, password);
        
        if (result) {
            console.log('✅ Password is CORRECT!');
            console.log('');
            console.log('User data returned:');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Password is INCORRECT');
            console.log('');
            console.log('Possible issues:');
            console.log('1. Password doesn\'t match the hash in database');
            console.log('2. Check for extra spaces or special characters');
            console.log('3. Verify the password hash was created correctly');
        }
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

testLogin().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

