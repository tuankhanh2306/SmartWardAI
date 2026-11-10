# ==============================================================================
# Multi-stage Dockerfile for SmartWard AI Frontend (React 18 + Vite 6 + Tailwind)
# Target: Nginx Alpine Static Serving with Zero-Cost Memory Footprint (<= 64MB RAM)
# ==============================================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /workspace

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and compile production bundle
COPY . .
RUN npm run build

# Stage 2: Minimal Production Web Server
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built bundle from builder stage
COPY --from=builder /workspace/dist .

# Copy custom nginx configuration with SPA fallback & API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
