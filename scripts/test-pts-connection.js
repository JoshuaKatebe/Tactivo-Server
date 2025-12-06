/**
 * Test script to verify PTS controller connection
 * Usage: node scripts/test-pts-connection.js
 */

require('dotenv').config();
const PTSClient = require('../lib/pts-client');
const config = require('../config/config');

async function testConnection() {
    console.log('Testing PTS Controller Connection...\n');
    console.log(`URL: ${config.pts.url}`);
    console.log(`Username: ${config.pts.username}\n`);

    const client = new PTSClient(config.pts);

    try {
        // Test 1: Get Configuration Identifier
        console.log('Test 1: GetConfigurationIdentifier...');
        const response1 = await client.createComplexRequest([{
            function: client.GetConfigurationIdentifier.bind(client),
            arguments: []
        }]);
        console.log('✅ Success:', JSON.stringify(response1, null, 2));
        console.log('');

        // Test 2: Get Pump Status (Pump 1)
        console.log('Test 2: GetPumpStatus (Pump 1)...');
        const response2 = await client.createComplexRequest([{
            function: client.PumpGetStatus.bind(client),
            arguments: [1]
        }]);
        console.log('✅ Success:', JSON.stringify(response2, null, 2));
        console.log('');

        // Test 3: Get Firmware Information
        console.log('Test 3: GetFirmwareInformation...');
        const response3 = await client.createComplexRequest([{
            function: client.GetFirmwareInformation.bind(client),
            arguments: []
        }]);
        console.log('✅ Success:', JSON.stringify(response3, null, 2));
        console.log('');

        console.log('✅ All tests passed! PTS controller is accessible.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

testConnection();

