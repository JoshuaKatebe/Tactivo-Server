# Troubleshooting Guide

## PowerShell Password Escaping

When using passwords with special characters in PowerShell, you need to escape them properly:

### Method 1: Use Single Quotes (Recommended)
```powershell
npm run test-login joshuakatebe '@we$omE123'
```

### Method 2: Escape the Dollar Sign
```powershell
npm run test-login joshuakatebe "@we`$omE123"
```

### Method 3: Use Double Quotes with Backtick
```powershell
npm run test-login joshuakatebe "@we``$omE123"
```

## Postman Login Issues

If password verification works in the script but fails in Postman:

1. **Check JSON encoding** - Make sure Postman is sending raw JSON
2. **Check for extra spaces** - Trim whitespace
3. **Verify Content-Type header** - Should be `application/json`
4. **Check server logs** - Look for error messages

## Common Issues

### Issue: Password works in script but not Postman
**Solution**: Check Postman request body is set to "raw" and "JSON", not "form-data" or "x-www-form-urlencoded"

### Issue: Special characters not working
**Solution**: Ensure proper JSON escaping in Postman (use double quotes)

### Issue: Token not saving
**Solution**: Add Test script to login request:
```javascript
const json = pm.response.json();
if (!json.error && json.data && json.data.token) {
    pm.environment.set("token", json.data.token);
}
```

