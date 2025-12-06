# Database Setup Guide

## PostgreSQL Setup

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Or use Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE tactivo;

# Create user (optional)
CREATE USER tactivo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tactivo TO tactivo_user;

# Exit
\q
```

### 3. Configure Environment

Create or update `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tactivo
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
DB_POOL_SIZE=20

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

### 4. Run Migrations

```bash
npm run migrate
```

This will create all tables according to the schema in `migrations/001_initial_schema.sql`.

### 5. Verify Setup

```bash
# Connect to database
psql -U postgres -d tactivo

# List tables
\dt

# Exit
\q
```

## Schema Overview

The database includes the following main entities:

1. **Organizations** - Top-level organizational structure
2. **Companies** - Client companies within organizations
3. **Stations** - Fuel stations
4. **Users** - Global login accounts
5. **Employees** - Station employees (may have user login)
6. **Roles & Permissions** - RBAC system
7. **PTS Controllers** - PTS controller registry
8. **Pumps & Nozzles** - Pump configuration
9. **Station Shifts** - PTS hardware shifts
10. **Employee Shifts** - App-level shifts
11. **Fuel Transactions** - Pump transactions
12. **Shop Products** - Retail products
13. **Shop Sales** - Shop transactions
14. **Payments** - Payment ledger
15. **Handovers** - Cash clearance
16. **Audit Logs** - Event logging
17. **Sync Queue** - Offline sync queue

## Initial Data Setup

### Create First Superuser

After running migrations, you can create a superuser via API:

```bash
# First, start the server
npm start

# In another terminal, create superuser
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPERUSER_TOKEN" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "email": "admin@example.com",
    "is_superuser": true
  }'
```

Or create directly in database:

```sql
-- Hash password using bcrypt (use online tool or Node.js)
-- Example: password "admin123" hashed = "$2b$10$..."
INSERT INTO users (username, password_hash, email, is_superuser)
VALUES ('admin', '$2b$10$...', 'admin@example.com', true);
```

### Create Test Organization Structure

```sql
-- Create organization
INSERT INTO organizations (name) VALUES ('Test Organization') RETURNING id;

-- Create company (replace ORGANIZATION_ID)
INSERT INTO companies (organization_id, name, contact)
VALUES ('ORGANIZATION_ID', 'Test Company', '{"phone": "123-456-7890"}') RETURNING id;

-- Create station (replace COMPANY_ID)
INSERT INTO stations (company_id, code, name, address, timezone)
VALUES ('COMPANY_ID', 'ST001', 'Test Station', '123 Main St', 'America/New_York') RETURNING id;
```

## Backup and Restore

### Backup
```bash
pg_dump -U postgres -d tactivo > backup.sql
```

### Restore
```bash
psql -U postgres -d tactivo < backup.sql
```

## Troubleshooting

### Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   # Windows
   services.msc (look for PostgreSQL service)
   
   # Linux/macOS
   sudo systemctl status postgresql
   ```

2. **Check connection:**
   ```bash
   psql -U postgres -h localhost -d tactivo
   ```

3. **Check firewall:** Ensure PostgreSQL port (5432) is not blocked

### Migration Issues

If migrations fail:
1. Check database connection in `.env`
2. Ensure PostgreSQL user has CREATE privileges
3. Check for existing tables that might conflict
4. Review error messages in logs

### Performance

For production:
- Adjust `DB_POOL_SIZE` based on expected load
- Enable connection pooling (PgBouncer)
- Set up read replicas for reporting
- Regular VACUUM and ANALYZE

## Next Steps

1. Run migrations: `npm run migrate`
2. Create initial superuser
3. Set up organization structure via API
4. Configure stations and PTS controllers
5. Add employees and assign roles


