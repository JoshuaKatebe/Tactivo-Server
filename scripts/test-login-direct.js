/**
 * Test login directly via HTTP request (simulates Postman)
 * Usage: node scripts/test-login-direct.js <username> <password>
 */

require('dotenv').config();
const axios = require('axios');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.log('Usage: node scripts/test-login-direct.js <username> <password>');
    process.exit(1);
}

async function testLogin() {
    try {
        console.log(`Testing login via HTTP for username: ${username}`);
        console.log(`Password length: ${password.length}`);
        console.log(`Password preview: ${password.substring(0, 3)}...`);
        console.log('');
        
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            username: username,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Login successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Login failed');
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLogin();

