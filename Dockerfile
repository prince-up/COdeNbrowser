FROM node:20-alpine

WORKDIR /app

# Copy root and package files
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/platform-windows/package*.json ./packages/platform-windows/
COPY packages/server/package*.json ./packages/server/
COPY packages/config-tool/package*.json ./packages/config-tool/
COPY packages/admin-dashboard/package*.json ./packages/admin-dashboard/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Expose port
EXPOSE 8080

ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["node", "packages/server/dist/server.js"]
