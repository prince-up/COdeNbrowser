FROM node:20-alpine

# Install Python 3, GCC, G++, and OpenJDK for multi-language sandbox
RUN apk add --no-cache python3 gcc g++ openjdk17-jdk libc-dev musl-dev

WORKDIR /app

# Copy root and package files
COPY package*.json ./

# Remove electron & koffi (not needed on server) to save ~200MB disk
RUN node -e "const p=require('./package.json'); delete p.dependencies.electron; delete p.dependencies.koffi; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2));"

COPY packages/core/package*.json ./packages/core/
COPY packages/platform-windows/package*.json ./packages/platform-windows/
COPY packages/server/package*.json ./packages/server/
COPY packages/config-tool/package*.json ./packages/config-tool/
COPY packages/admin-dashboard/package*.json ./packages/admin-dashboard/

# Install dependencies (no electron!)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build server-side packages only (skip client - it's Electron desktop app)
RUN npm run build:core && npm run build:platform && npm run build:server && npm run build:config

# Expose port
EXPOSE 8080

ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["node", "packages/server/dist/server.js"]
