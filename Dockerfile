# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 5173

# Start command (will be overridden in docker-compose.yml)
CMD ["npm", "run", "dev:server"]
