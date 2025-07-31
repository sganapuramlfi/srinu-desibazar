FROM node:20-alpine

WORKDIR /app

# Copy client package files
COPY client/package*.json ./
RUN npm install

# Copy the db folder
COPY db ./db

# Copy client files
COPY client .

EXPOSE 5173

CMD ["npm", "run", "dev"]