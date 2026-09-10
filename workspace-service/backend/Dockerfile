# Node.js backend - Development-ready Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies like nodemon)
# This supports both development and production modes
RUN npm ci

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 5000

# Default command (can be overridden by docker-compose)
CMD ["npm", "start"]
