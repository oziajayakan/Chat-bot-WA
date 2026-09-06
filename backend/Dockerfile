FROM node:20-alpine

# Install build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Persistent volume untuk sessions & database
VOLUME ["/app/sessions", "/app/database.sqlite"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
