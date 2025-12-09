
require('dotenv').config();
const PTSClient = require('../lib/pts-client');
const config = require('../config/config');

// Mock axios to intercept and log the request
const originalAxiosCreate = require('axios').create;
const mockAxios = {
    post: async (url, data, config) => {
        console.log('\n--- INTERCEPTED REQUEST ---');
        console.log('URL:', url || '(Base URL)');
        console.log('Headers:', config ? config.headers : 'None');
        console.log('Body:', data);
        console.log('---------------------------\n');

        // Simulate a 401 response for the first request to trigger Digest flow
        if (!config || !config.headers || !config.headers.Authorization) {
            console.log('Simulating 401 Unauthorized (Digest Challenge)...');
            const error = new Error('Request failed with status code 401');
            error.response = {
                status: 401,
                statusText: 'Unauthorized',
                headers: {
                    'www-authenticate': 'Digest realm="PTS", nonce="5f6ad9c8", qop="auth", opaque="0000000000000000", algorithm="MD5"'
                },
                data: ''
            };
            throw error;
        }

        // Simulate success for authorized request
        console.log('Simulating 200 OK (Authorized)...');
        return {
            data: {
                Protocol: 'jsonPTS',
                Packets: [{ Id: 1, Type: 'GetConfigurationIdentifier', Data: { Identifier: 'MOCK_ID' } }]
            }
        };
    }
};

// Override client creation
// We need to modify the PTSClient prototype or how it's instantiated to use our mock
// For this script, we'll just instantiate it and then replace the internal client
const client = new PTSClient(config.pts);
client.client = mockAxios;

async function debugRequest() {
    try {
        console.log('Debugging PTS Request generation...');
        await client.createComplexRequest([{
            function: client.GetConfigurationIdentifier.bind(client),
            arguments: []
        }]);
        console.log('Request flow completed successfully.');
    } catch (error) {
        console.error('Request generation failed:', error.message);
    }
}

debugRequest();
