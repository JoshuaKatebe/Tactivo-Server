/**
 * Test password hashing and verification
 * Usage: node scripts/test-password.js <password>
 */

const bcrypt = require('bcrypt');

const password = process.argv[2] || '@we$omE123';

console.log('Testing password:', password);
console.log('');

// Generate a hash
bcrypt.hash(password, 10).then(hash => {
    console.log('Generated hash:', hash);
    console.log('');
    
    // Verify the password against the hash
    bcrypt.compare(password, hash).then(result => {
        console.log('Password matches hash:', result);
        console.log('');
        
        // Test with wrong password
        bcrypt.compare('wrongpassword', hash).then(wrongResult => {
            console.log('Wrong password matches:', wrongResult);
        });
    });
});

