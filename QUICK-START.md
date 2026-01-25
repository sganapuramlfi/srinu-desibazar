# DesiBazaar Quick Start & Troubleshooting

## 🚀 Quick Start
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs server --tail=20
```

## 🌐 Access URLs
- **Frontend**: http://localhost:9102 (React App)
- **Backend API**: http://localhost:9101 (Express Server)
- **Database**: localhost:9100 (PostgreSQL)
- **Ollama AI**: http://localhost:11435

## 🔍 Quick Health Check
```bash
# Test API
curl http://localhost:9101/api/statistics

# Test frontend
curl http://localhost:9102 | head -5

# Check Abrakadabra AI
# Visit http://localhost:9102 and look for floating AI icon
```

## 🛠️ Common Issues & Fixes

### ❌ "Cannot find module '/app/server/db'"
```bash
# CAUSE: Wrong volume mount in docker-compose.yml
# FIX: Ensure volume is ./server:/app (NOT /app/server)
docker-compose down
# Edit docker-compose.yml: ./server:/app
docker-compose up -d --build
```

### ❌ "ERR_MODULE_NOT_FOUND: '../db/schema'"
```bash
# CAUSE: Missing .js extension in import
# FIX: Add .js extension to imports
# Change: from "../db/schema" 
# To: from "../db/schema.js"
```

### ❌ Server container crashes on startup
```bash
# Check logs
docker-compose logs server

# Rebuild container
docker-compose down
docker-compose up -d --build server
```

### ❌ Frontend shows blank page
```bash
# Check if backend is running
curl http://localhost:9101/api/statistics

# Restart frontend
docker-compose restart client
```

## 📋 Import Path Quick Reference

| File Location | Database Import |
|---------------|----------------|
| `/server/auth.ts` | `"./db/index.js"` |
| `/server/routes.ts` | `"./db/index.js"` |
| `/server/routes/*.ts` | `"../db/index.js"` |

## 🔄 Full Reset (Nuclear Option)
```bash
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

## 📚 Detailed Documentation
- **Docker Paths**: See `DOCKER-PATHS.md`
- **Test Scripts**: Run `bash test-api-comprehensive.sh`
- **AI Features**: Components in `client/src/components/Abrakadabra*.tsx`

---
**💡 Pro Tip**: Always check `DOCKER-PATHS.md` before modifying Docker configuration!