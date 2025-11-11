# ============================================
# Multi-stage Dockerfile for Railway Deployment
# ============================================

# ----------------- Build Stage -----------------
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++ gcc git

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10.19.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code and configuration files
COPY . .

# Build the TypeScript application
RUN pnpm run build

# ----------------- Production Stage -----------------
FROM node:20-alpine

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++ gcc

# Install pnpm globally
RUN npm install -g pnpm@10.19.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application and necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Set environment variable for port (Railway provides this)
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE ${PORT}

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application in production mode
CMD ["node", "dist/main"]
