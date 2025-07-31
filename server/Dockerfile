FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./
RUN npm install

# Copy the db folder
COPY db ./db

# Copy the modules folder
COPY modules ./modules

# Copy server files
COPY server .

EXPOSE 3000

CMD ["npm", "run", "dev"]