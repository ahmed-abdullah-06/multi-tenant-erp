# Use a lightweight Node.js 18 Alpine image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY server/package*.json ./server/

# Install strictly production dependencies to keep the image lean
RUN npm ci --omit=dev

# Copy the Prisma schema and generate the database client
COPY server/prisma ./server/prisma
RUN npx prisma generate

# Copy the remaining application code (client and server)
COPY . .

# Expose the API and Frontend port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]