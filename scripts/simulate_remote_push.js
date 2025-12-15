/**
 * Simulate PTS Remote Push
 * Usage: node scripts/simulate_remote_push.js
 */

const axios = require('axios');

async function testPush() {
    const url = 'http://localhost:3001/api/pts/tanks';

    // 1. Create a dummy packet mimicking the PTS Controller
    const payload = {
        Protocol: 'jsonPTS',
        Packets: [
            {
                Id: 1,
                Type: 'ProbeMeasurements',
                Data: {
                    Probe: 1,
                    Status: 'OK',
                    ProductHeight: 1500, // 1500mm
                    ProductVolume: 25000,
                    FuelGradeId: 1,
                    Temperature: 22
                }
            }
        ]
    };

    console.log('1. Sending Push Data to Listener:', url);
    console.log(JSON.stringify(payload, null, 2));

    try {
        // 2. Send POST request (Acting as PTS Controller)
        const postRes = await axios.post(url, payload);
        console.log('\n2. Received Acknowledgement from Server:');
        console.log(JSON.stringify(postRes.data, null, 2));

        // 3. Check if Server State Updated (Acting as Frontend Client)
        console.log('\n3. Checking Server State (GET /api/fuel/tanks)...');
        const getRes = await axios.get('http://localhost:3001/api/fuel/tanks');
        console.log('Current Server State:');
        console.log(JSON.stringify(getRes.data, null, 2));

        // Validation
        const tank1 = getRes.data.data['1'];
        if (tank1 && tank1.ProductHeight === 1500) {
            console.log('\n✅ SUCCESS: Push data was correctly stored and retrieved!');
        } else {
            console.log('\n❌ FAILURE: Data mismatch or not found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response:', error.response.data);
        }
    }
}

testPush();
