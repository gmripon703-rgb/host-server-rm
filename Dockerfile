# Multi-stage production build for NexusControl
# Node.js 22 LTS Alpine
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build React client bundle
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy built frontend assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts

# Create storage directory for local persistence fallback
RUN mkdir -p /app/data/storage/files && chown -R node:node /app/data

# Run as non-root user
USER node

EXPOSE 3000

# Start server with tsx
CMD ["node", "--loader", "tsx", "server.ts"]
