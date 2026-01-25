# Docker Configuration & Path Management Guide

## 🚨 CRITICAL: Always check this file before modifying Docker configuration!

### Port Mappings (NEVER CHANGE WITHOUT UPDATING ALL REFERENCES)
```
Frontend (React):  http://localhost:9102 → container:5173
Backend API:        http://localhost:9101 → container:3000  
Database:           localhost:9100 → container:5432
Ollama AI:          http://localhost:11435 → container:11434
```

### Container File Structure

#### Server Container (/app)
```
/app/
├── db/                    (mounted from ./db)
│   ├── index.ts          (exports: db)
│   └── schema.ts         (exports: all tables)
├── modules/               (mounted from ./modules)
│   └── core/
│       ├── ModuleRegistry.ts
│       └── types.ts
├── routes/                (mounted from ./server/routes)
│   ├── slots.ts
│   ├── bookings.ts
│   ├── salon.ts
│   └── ...
├── auth.ts               (mounted from ./server/auth.ts)
├── index.ts              (mounted from ./server/index.ts)
├── routes.ts             (mounted from ./server/routes.ts)
└── package.json          (mounted from ./server/package.json)
```

### Import Path Rules (CRITICAL FOR TYPESCRIPT)

#### From server root files (/app/*.ts):
```typescript
// ✅ CORRECT
import { db } from "./db/index.js";
import { users, businesses } from "./db/schema.js";
import { ModuleRegistry } from "./modules/core/ModuleRegistry.js";

// ❌ WRONG - will cause ERR_MODULE_NOT_FOUND
import { db } from "../db";
import { users } from "./db/schema";
```

#### From route files (/app/routes/*.ts):
```typescript
// ✅ CORRECT  
import { db } from "../db/index.js";
import { users, businesses } from "../db/schema.js";

// ❌ WRONG - will cause ERR_MODULE_NOT_FOUND
import { db } from "../../db";
import { users } from "../db/schema";
```

### Volume Mount Configuration

#### docker-compose.yml server volumes:
```yaml
volumes:
  - ./server:/app          # Server files → container root
  - ./db:/app/db          # Database schema → /app/db
  - ./modules:/app/modules # Modules → /app/modules
  - /app/node_modules     # Preserve installed packages
```

#### ⚠️ NEVER do this:
```yaml
# ❌ WRONG - breaks all import paths
volumes:
  - ./server:/app/server
```

### Troubleshooting Common Errors

#### Error: "Cannot find module '/app/server/db'"
**Cause**: Volume mounted server files to /app/server instead of /app
**Fix**: Change volume mount from `./server:/app/server` to `./server:/app`

#### Error: "Cannot find module '../db/schema'"
**Cause**: Import path missing .js extension in ESM
**Fix**: Change `"../db/schema"` to `"../db/schema.js"`

#### Error: "ERR_MODULE_NOT_FOUND: '../modules/core/ModuleRegistry'"
**Cause**: Missing modules volume mount
**Fix**: Add `./modules:/app/modules` to docker-compose volumes

### Quick Import Path Reference

| File Location | Database Import | Schema Import |
|---------------|----------------|---------------|
| `/app/auth.ts` | `"./db/index.js"` | `"./db/schema.js"` |
| `/app/routes.ts` | `"./db/index.js"` | `"./db/schema.js"` |
| `/app/routes/slots.ts` | `"../db/index.js"` | `"../db/schema.js"` |
| `/app/routes/bookings.ts` | `"../db/index.js"` | `"../db/schema.js"` |

### Testing After Changes

Always run these commands after modifying Docker configuration:

```bash
# 1. Rebuild containers
docker-compose down
docker-compose up -d --build

# 2. Check server logs for import errors
docker-compose logs server --tail=20

# 3. Test API endpoints
curl http://localhost:9101/api/statistics
curl http://localhost:9101/api/businesses

# 4. Test frontend
curl http://localhost:9102
```

### Emergency Recovery

If imports break, revert to this working configuration:

1. **server/Dockerfile**: Copy db and modules to /app, copy server files to /app root
2. **docker-compose.yml**: Mount ./server to /app (NOT /app/server)
3. **Import paths**: Use relative paths with .js extensions
4. **Test scripts**: Use port 9101 for API, 9102 for frontend

---

**📝 Last Updated**: After fixing import path issues - August 2025
**🔄 Next Update**: When Docker configuration changes