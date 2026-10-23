# EcoSense AI Database Configuration

## Prerequisites

### Windows Installation

1. **Download PostgreSQL 14+:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the Windows installer (recommended version: 14.x or 15.x)
   - Run the installer and follow the setup wizard

2. **Installation Steps:**
   - Choose installation directory (default: `C:\Program Files\PostgreSQL\14`)
   - Select components:
     - ✅ PostgreSQL Server
     - ✅ pgAdmin 4 (GUI tool)
     - ✅ Command Line Tools
     - ✅ Stack Builder (for PostGIS)
   - Set superuser (postgres) password: **Remember this password!**
   - Port: `5432` (default)
   - Locale: Default

3. **Install PostGIS Extension:**
   - After PostgreSQL installation completes, Stack Builder will launch
   - Select your PostgreSQL installation
   - Under "Spatial Extensions", select **PostGIS**
   - Follow the installation wizard
   - OR download from: https://postgis.net/windows_downloads/

### Verify Installation

Open PowerShell and run:

```powershell
# Check PostgreSQL version
psql --version

# Should output: psql (PostgreSQL) 14.x or higher
```

If `psql` is not found, add to PATH:
- Right-click "This PC" → Properties → Advanced System Settings
- Environment Variables → System Variables → Path → Edit
- Add: `C:\Program Files\PostgreSQL\14\bin`

## Database Setup

### 1. Create Database

Open PowerShell:

```powershell
# Connect to PostgreSQL (will prompt for password)
psql -U postgres

# Inside psql, run:
CREATE DATABASE ecosense_ai;
\q
```

### 2. Initialize Schema

```powershell
# Run initialization script
psql -U postgres -d ecosense_ai -f database\init.sql
```

Expected output:
```
CREATE EXTENSION
...
NOTICE:  EcoSense AI database initialized successfully!
NOTICE:  PostGIS version: 3.x ...
```

### 3. Verify Setup

```powershell
# Connect to database
psql -U postgres -d ecosense_ai

# Check PostGIS
SELECT PostGIS_Version();

# List tables
\dt

# Exit
\q
```

### 4. Configure Backend Connection

Create `backend/.env` file:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ecosense_ai
```

Replace `YOUR_PASSWORD` with the password you set during installation.

## GUI Alternative: pgAdmin 4

1. Open pgAdmin 4 (installed with PostgreSQL)
2. Right-click "Servers" → Register → Server
3. General tab: Name = "EcoSense AI Local"
4. Connection tab:
   - Host: localhost
   - Port: 5432
   - Database: postgres
   - Username: postgres
   - Password: [your password]
5. Right-click server → Create → Database → Name: "ecosense_ai"
6. Right-click "ecosense_ai" → Query Tool
7. Copy contents of `init.sql` and execute

## Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Example:
```
postgresql://postgres:mypassword@localhost:5432/ecosense_ai
```

## Troubleshooting

### Issue: "psql: command not found"
- Add PostgreSQL bin directory to PATH (see Verify Installation)

### Issue: "password authentication failed"
- Verify password is correct
- Reset password:
  ```powershell
  psql -U postgres
  ALTER USER postgres PASSWORD 'newpassword';
  ```

### Issue: "database does not exist"
- Create database first: `CREATE DATABASE ecosense_ai;`

### Issue: "PostGIS extension not found"
- Install PostGIS using Stack Builder
- Or download from: https://postgis.net/windows_downloads/

## Phase 1 Status

**Database Schema:** Basic tables created (locations, analyses)  
**Status:** ⏳ Awaiting PostgreSQL installation and configuration  
**Next Phase:** Phase 2 will add location resolution and geocoding integration
