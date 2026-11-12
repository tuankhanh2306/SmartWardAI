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
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Stage 2: Minimal Production Web Server
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./* /etc/nginx/conf.d/default.conf

# Copy built bundle from builder stage
COPY --from=builder /workspace/dist .

# Dynamic upstream support (defaults to Docker Compose http://backend:8080, overridable in Railway/Cloud)
ENV BACKEND_URL=http://backend:8080
ENV NGINX_ENVSUBST_FILTER=^BACKEND_URL$
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
