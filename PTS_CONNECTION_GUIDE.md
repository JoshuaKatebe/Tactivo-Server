# PTS-2 Controller Connection Guide

## Understanding the Error

**Error:** `connect ECONNREFUSED 192.168.1.117:443`

**What it means:**
- Your Node.js server is trying to connect to the PTS controller at `192.168.1.117` on port **443** (HTTPS)
- The connection is being **refused** because the PTS controller is only listening on port **80** (HTTP)
- The PTS controller's web interface shows "Not secure", confirming it uses HTTP, not HTTPS

## Network Setup

Based on your configuration:

- **PTS Controller IP:** `192.168.1.117` (the PTS-2 device)
- **Node.js Server IP:** `192.168.1.183` (your laptop running the server)
- **PTS Controller Protocol:** HTTP (port 80)
- **PTS Controller Endpoint:** `/jsonPTS`

## Solution: Use HTTP Instead of HTTPS

The configuration has been updated to use HTTP. You have two options:

### Option 1: Use Environment Variable (Recommended)

Create a `.env` file in your project root (if it doesn't exist):

```env
# PTS Controller Configuration
PTS_URL=http://192.168.1.117/jsonPTS
PTS_USERNAME=admin
PTS_PASSWORD=admin
PTS_TIMEOUT=30000
PTS_POLLING_INTERVAL=1000
```

### Option 2: Use Default Configuration

The `config.js` file has been updated with the correct default:
- Changed from: `https://192.168.1.117/jsonPTS`
- Changed to: `http://192.168.1.117/jsonPTS`

## Verifying the Connection

### Step 1: Test PTS Controller Accessibility

From your laptop (where the server runs), test if you can reach the PTS controller:

**Using PowerShell:**
```powershell
# Test HTTP connection
Invoke-WebRequest -Uri "http://192.168.1.117/jsonPTS" -Method POST -Body '{"Protocol":"jsonPTS","Packets":[]}' -ContentType "application/json" -Headers @{Authorization="Basic YWRtaW46YWRtaW4="}
```

**Using curl (if available):**
```bash
curl -X POST http://192.168.1.117/jsonPTS \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{"Protocol":"jsonPTS","Packets":[]}'
```

**Using browser:**
- Navigate to: `http://192.168.1.117`
- You should see the PTS controller's web interface

### Step 2: Check Server Logs

After restarting your server, you should see:
```
✅ Sending request to PTS {"url":"http://192.168.1.117/jsonPTS"}
```

Instead of the previous error.

### Step 3: Test with Server Script

Run the PTS connection test script:
```bash
npm run test-pts
```

## PTS Controller Configuration

Based on your screenshots, here's what I noticed:

### Current PTS Controller Settings:

1. **PTS Controller IP:** `192.168.1.117` ✅
2. **Protocol Type:** `HTTP` ✅ (This is correct)
3. **Remote Server IP:** `192.168.1.183` (Your Node.js server)
4. **Server User:** `admin`
5. **Communication Status:** Red X (not connected)

### What the PTS Controller Needs:

The PTS controller is configured to connect **to** your server (`192.168.1.183`), but for the Node.js server to connect **to** the PTS controller, you need:

1. ✅ **PTS Controller accessible on network** - `192.168.1.117` ✅
2. ✅ **HTTP protocol** - Already configured ✅
3. ✅ **jsonPTS endpoint** - Should be at `/jsonPTS` ✅
4. ✅ **Authentication** - Username/password configured ✅

## Additional Configuration Checks

### 1. Verify PTS Controller Endpoint

The jsonPTS endpoint should be accessible at:
```
http://192.168.1.117/jsonPTS
```

**Test in browser:**
- Go to: `http://192.168.1.117/jsonPTS`
- You might see an error (that's OK - it expects POST requests)
- If you get "404 Not Found", the endpoint path might be different

### 2. Check PTS Controller Authentication

The PTS controller uses **Digest Authentication** (not Basic):
- **Authentication Type:** Digest (as shown in PTS controller settings)
- **Username:** `admin` (default)
- **Password:** `admin` (default)

**✅ Digest authentication is now automatically handled by the server.**

**Update in `.env` if credentials are different:**
```env
PTS_USERNAME=your_username
PTS_PASSWORD=your_password
```

**How it works:**
1. Server makes initial request
2. PTS controller responds with 401 and Digest challenge
3. Server automatically generates Digest response
4. Server retries request with Digest authentication header
5. PTS controller authenticates and responds

### 3. Network Connectivity

Ensure both devices are on the same network:
- **PTS Controller:** `192.168.1.117`
- **Node.js Server:** `192.168.1.183`
- Both should be on the same WiFi network

**Test connectivity:**
```powershell
# From your laptop
ping 192.168.1.117
```

### 4. Firewall Considerations

The PTS controller might have a firewall blocking connections. Check:
- PTS controller's firewall settings
- Router firewall rules
- Windows Firewall on your laptop (should allow outbound connections)

## Troubleshooting

### Error: "ECONNREFUSED" (Connection Refused)

**Possible causes:**
1. ✅ **Wrong protocol** - Fixed by changing to HTTP
2. **Wrong port** - Should be port 80 for HTTP
3. **PTS controller not running** - Check PTS controller status
4. **Firewall blocking** - Check firewall settings
5. **Wrong IP address** - Verify PTS controller IP

**Solutions:**
- Verify PTS controller is powered on and accessible
- Check if you can access `http://192.168.1.117` in browser
- Verify network connectivity with `ping 192.168.1.117`

### Error: "ETIMEDOUT" (Connection Timeout)

**Possible causes:**
1. **Network issue** - Devices not on same network
2. **PTS controller slow to respond** - Increase timeout
3. **Network congestion** - Check network quality

**Solutions:**
- Increase timeout in `.env`:
  ```env
  PTS_TIMEOUT=60000  # 60 seconds
  ```
- Verify network connectivity
- Check PTS controller status

### Error: "401 Unauthorized" or "403 Forbidden"

**Possible causes:**
1. **Wrong username/password**
2. **Authentication type mismatch** - PTS controller uses **Digest authentication**, not Basic
3. **Authentication not enabled on PTS controller**

**Solutions:**
- ✅ **Digest authentication is now implemented** - The server automatically handles Digest auth
- Verify credentials in PTS controller settings (default: `admin`/`admin`)
- Update `.env` with correct credentials:
  ```env
  PTS_USERNAME=correct_username
  PTS_PASSWORD=correct_password
  ```
- Check PTS controller's "Used authentication type" setting (should be "Digest")

### Error: "404 Not Found"

**Possible causes:**
1. **Wrong endpoint path** - Might not be `/jsonPTS`
2. **PTS controller firmware version** - Different versions might use different paths

**Solutions:**
- Check PTS controller documentation for correct endpoint
- Try different paths: `/jsonPTS`, `/api/jsonPTS`, `/pts/jsonPTS`
- Check PTS controller firmware version

## Testing the Connection

### 1. Restart Your Server

After updating the configuration:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm start
```

### 2. Check Server Logs

You should see:
```
✅ Starting fuel service polling
✅ Sending request to PTS {"url":"http://192.168.1.117/jsonPTS"}
```

Instead of errors.

### 3. Test API Endpoint

Try getting pump status:
```bash
GET http://192.168.1.183:3000/api/fuel/pumps/status
Authorization: Bearer YOUR_TOKEN
```

### 4. Use Test Script

```bash
npm run test-pts
```

## Additional Information Needed

To help further troubleshoot, please provide:

1. **PTS Controller Firmware Version:**
   - From the screenshot: `ver. 2025.08.26 16:14:12` ✅
   - This is good - recent version

2. **Can you access PTS controller in browser?**
   - Go to: `http://192.168.1.117`
   - Does it load? ✅ (Yes, from your screenshot)

3. **PTS Controller jsonPTS Endpoint:**
   - Try: `http://192.168.1.117/jsonPTS`
   - What response do you get? (Even an error is OK - it means the endpoint exists)

4. **Network Ping Test:**
   ```powershell
   ping 192.168.1.117
   ```
   - Does it respond?

5. **PTS Controller Authentication:**
   - Are the default credentials (`admin`/`admin`) correct?
   - Or do you have different credentials?

## Summary

✅ **Fixed:** Changed `https://` to `http://` in configuration
✅ **PTS Controller IP:** `192.168.1.117` (confirmed from screenshot)
✅ **Node.js Server IP:** `192.168.1.183` (your server)
✅ **Protocol:** HTTP (port 80)

**Next Steps:**
1. Restart your server
2. Check server logs for connection attempts
3. Test the connection with `npm run test-pts`
4. Verify pump status endpoint works

The connection should now work! If you still see errors, share the new error message and we can troubleshoot further.

