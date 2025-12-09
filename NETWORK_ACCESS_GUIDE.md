# Network Access Guide

## Making Your Server Accessible on Local Network

This guide explains how to make your Tactivo server accessible from other computers on the same WiFi network.

## Quick Steps

1. **Find your computer's IP address**
2. **Configure Windows Firewall** (if needed)
3. **Update server configuration** (already done!)
4. **Access from other devices**

---

## Step 1: Find Your Local IP Address

### Method 1: Using Command Prompt (Recommended)

1. Open **Command Prompt** (Press `Win + R`, type `cmd`, press Enter)
2. Run:
   ```cmd
   ipconfig
   ```
3. Look for **"IPv4 Address"** under your WiFi adapter (usually named "Wireless LAN adapter Wi-Fi" or similar)
   - Example: `192.168.1.100` or `192.168.0.50`

### Method 2: Using PowerShell

1. Open **PowerShell**
2. Run:
   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object IPAddress, InterfaceAlias
   ```

### Method 3: Check Server Logs

When you start the server, it now automatically displays your network IP address:
```
🌐 Network access: http://192.168.1.100:3000
```

---

## Step 2: Configure Windows Firewall

Windows Firewall may block incoming connections. You need to allow Node.js through the firewall.

### Option A: Allow Node.js Through Firewall (Recommended)

1. Open **Windows Defender Firewall**:
   - Press `Win + R`, type `wf.msc`, press Enter
   - Or search "Windows Defender Firewall" in Start menu

2. Click **"Allow an app or feature through Windows Defender Firewall"** (on the left)

3. Click **"Change settings"** (top right, requires admin)

4. Click **"Allow another app..."** (bottom right)

5. Click **"Browse..."** and navigate to:
   ```
   C:\Program Files\nodejs\node.exe
   ```
   (Or wherever Node.js is installed)

6. Click **"Add"**, then check both **"Private"** and **"Public"** boxes

7. Click **"OK"**

### Option B: Create Inbound Rule for Port 3000

1. Open **Windows Defender Firewall** (`wf.msc`)

2. Click **"Inbound Rules"** (left sidebar)

3. Click **"New Rule..."** (right sidebar)

4. Select **"Port"** → Next

5. Select **"TCP"** and enter **"3000"** in "Specific local ports" → Next

6. Select **"Allow the connection"** → Next

7. Check all three (Domain, Private, Public) → Next

8. Name it **"Tactivo Server"** → Finish

### Option C: Temporarily Disable Firewall (NOT RECOMMENDED)

⚠️ **Only for testing!** Not recommended for production.

1. Open **Windows Defender Firewall**
2. Click **"Turn Windows Defender Firewall on or off"**
3. Turn off for **Private networks** (temporarily)
4. **Remember to turn it back on after testing!**

---

## Step 3: Verify Server Configuration

The server has been updated to:
- ✅ Listen on all network interfaces (`0.0.0.0`)
- ✅ Display your network IP address in logs
- ✅ Enable CORS for cross-origin requests

When you start the server, you should see:
```
🚀 Tactivo Server running on port 3000
📍 Local access: http://localhost:3000
🌐 Network access: http://192.168.1.100:3000
📡 WebSocket server: ws://192.168.1.100:3000/ws
📚 Swagger UI: http://192.168.1.100:3000/api-docs
```

---

## Step 4: Access from Other Devices

### From Another Computer on Same WiFi

1. **Find your server's IP address** (from Step 1)
   - Example: `192.168.1.100`

2. **On the other computer**, open a web browser and go to:
   ```
   http://192.168.1.100:3000
   ```

3. **Test the API:**
   ```
   http://192.168.1.100:3000/api/health
   ```

4. **Access Swagger UI:**
   ```
   http://192.168.1.100:3000/api-docs
   ```

### From Mobile Device on Same WiFi

1. **Find your server's IP address**

2. **On your phone/tablet**, open a browser and go to:
   ```
   http://192.168.1.100:3000/api-docs
   ```

### Using Postman on Another Computer

1. **Base URL:** `http://192.168.1.100:3000`
2. **Example request:**
   ```
   GET http://192.168.1.100:3000/api/health
   ```

---

## Step 5: Database Configuration (If Needed)

If other devices need to connect directly to PostgreSQL (not recommended), you'll need to:

### PostgreSQL Network Access

1. **Edit PostgreSQL config** (`postgresql.conf`):
   ```
   listen_addresses = '*'
   ```

2. **Edit `pg_hba.conf`**:
   ```
   host    all    all    192.168.0.0/16    md5
   ```

3. **Restart PostgreSQL service**

⚠️ **Note:** For security, it's better to keep PostgreSQL on `localhost` and only expose the Node.js API server.

---

## Troubleshooting

### "Connection Refused" or "Can't Connect"

**Possible causes:**
1. **Firewall blocking** - See Step 2
2. **Wrong IP address** - Verify with `ipconfig`
3. **Server not running** - Check server logs
4. **Different network** - Ensure both devices are on same WiFi

**Solutions:**
- Check Windows Firewall settings
- Verify IP address with `ipconfig`
- Try pinging the server: `ping 192.168.1.100`
- Ensure both devices are on the same WiFi network

### "ERR_CONNECTION_TIMED_OUT"

**Possible causes:**
- Firewall blocking the connection
- Server crashed or stopped
- Wrong port number

**Solutions:**
- Check firewall rules (Step 2)
- Verify server is running: `http://localhost:3000/api/health`
- Check server logs for errors

### Can Access from Localhost but Not Network

**This means:**
- Server is running ✅
- Firewall is blocking network access ❌

**Solution:**
- Follow Step 2 to configure Windows Firewall

### IP Address Changes

**Problem:** Your IP address may change when you reconnect to WiFi.

**Solutions:**
1. **Check IP each time** you start the server (it's shown in logs)
2. **Set static IP** (advanced):
   - Open Network Settings
   - Go to WiFi → Properties → IPv4
   - Set static IP (e.g., `192.168.1.100`)
   - Set Gateway and DNS (usually `192.168.1.1`)

### CORS Errors in Browser

**If you see CORS errors:**
- The server already has CORS enabled ✅
- Check that you're using the correct URL
- Ensure the server is actually running

---

## Testing Network Access

### Test 1: Health Check

From another computer:
```bash
curl http://192.168.1.100:3000/api/health
```

Or in browser:
```
http://192.168.1.100:3000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

### Test 2: Swagger UI

From another computer's browser:
```
http://192.168.1.100:3000/api-docs
```

You should see the Swagger UI interface.

### Test 3: API Request

From Postman on another computer:
```
POST http://192.168.1.100:3000/api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

---

## Security Considerations

### For Development (Current Setup)

✅ **Current setup is fine for development:**
- CORS enabled (allows cross-origin requests)
- Server accessible on local network
- Database on localhost (protected)

### For Production

⚠️ **Before deploying to production, consider:**
1. **Authentication** - Ensure all endpoints require authentication
2. **HTTPS** - Use SSL/TLS certificates
3. **Rate Limiting** - Prevent abuse
4. **Firewall Rules** - Restrict access to specific IPs
5. **Database Security** - Never expose PostgreSQL directly
6. **Environment Variables** - Keep secrets in `.env` file

---

## Quick Reference

### Server URLs

- **Local:** `http://localhost:3000`
- **Network:** `http://YOUR_IP:3000` (check server logs)
- **Swagger:** `http://YOUR_IP:3000/api-docs`
- **WebSocket:** `ws://YOUR_IP:3000/ws`

### Finding Your IP

**Windows:**
```cmd
ipconfig
```

**PowerShell:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*"}
```

**Server Logs:**
Check the startup message for "🌐 Network access:"

### Firewall Commands

**Check if port is open:**
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

**List firewall rules:**
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*"}
```

---

## Summary

1. ✅ **Server is configured** to listen on all interfaces
2. 🔍 **Find your IP** with `ipconfig` or check server logs
3. 🔥 **Configure Windows Firewall** to allow Node.js/port 3000
4. 🌐 **Access from other devices** using `http://YOUR_IP:3000`
5. ✅ **Test** with health check or Swagger UI

**Your server should now be accessible from any device on the same WiFi network!**

---

**Need Help?** 
- Check server logs for the network IP address
- Verify firewall settings
- Ensure both devices are on the same WiFi network
- Test with `http://YOUR_IP:3000/api/health` first

