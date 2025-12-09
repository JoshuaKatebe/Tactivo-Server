/**
 * Get Local Network IP Address
 * 
 * This script helps you find your computer's IP address on the local network
 * so other devices can access the server.
 */

const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({
                    interface: name,
                    address: iface.address,
                    netmask: iface.netmask
                });
            }
        }
    }

    return addresses;
}

console.log('\n🌐 Network IP Addresses:\n');
console.log('Use these addresses to access the server from other devices on the same WiFi network.\n');

const addresses = getLocalIP();

if (addresses.length === 0) {
    console.log('❌ No network interfaces found. Make sure you\'re connected to WiFi or Ethernet.\n');
    process.exit(1);
}

addresses.forEach((addr, index) => {
    console.log(`${index + 1}. ${addr.interface}:`);
    console.log(`   IP Address: ${addr.address}`);
    console.log(`   Server URL: http://${addr.address}:3000`);
    console.log(`   Swagger UI: http://${addr.address}:3000/api-docs`);
    console.log(`   WebSocket:   ws://${addr.address}:3000/ws\n`);
});

// Highlight the first (usually primary) address
if (addresses.length > 0) {
    const primary = addresses[0];
    console.log('📌 Primary address (use this):');
    console.log(`   http://${primary.address}:3000\n`);
}

