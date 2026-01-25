# DesiBazaar Server Dockerfile
# 
# CRITICAL PATH STRUCTURE DOCUMENTATION:
# Container structure: /app/
# ├── db/           (from host: ./db -> container: /app/db)
# ├── modules/      (from host: ./modules -> container: /app/modules)  
# ├── server files  (from host: ./server -> container: /app/)
#
# IMPORT PATHS IN SERVER CODE MUST BE:
# - Database imports: "../db/index.js" and "../db/schema.js"
# - Module imports: "../modules/core/ModuleRegistry.js"
# - Route file imports: "../../db/index.js" and "../../db/schema.js"
#
# ⚠️  WARNING: DO NOT CHANGE COPY ORDER OR PATHS WITHOUT UPDATING IMPORTS!

FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./
RUN npm install

# Copy the db folder to /app/db (enables ../db imports from server files)
COPY db ./db

# Copy the modules folder to /app/modules (enables ../modules imports from server files)  
COPY modules ./modules

# Copy server files to /app root (server files become /app/*.ts)
COPY server .

EXPOSE 3000

CMD ["npm", "run", "dev"]