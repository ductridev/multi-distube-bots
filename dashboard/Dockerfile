# Stage 1: Build Next.js application
FROM node:23-alpine AS builder

WORKDIR /app

# Build arguments for environment variables needed at build time
# These are used by Next.js for client-side code (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_API_URL=http://localhost:3002
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID=""
ARG NEXT_PUBLIC_DASHBOARD_URL=http://localhost:20082
ARG NODE_ENV=production

# Set environment variables for build steps
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DISCORD_CLIENT_ID=${NEXT_PUBLIC_DISCORD_CLIENT_ID}
ENV NEXT_PUBLIC_DASHBOARD_URL=${NEXT_PUBLIC_DASHBOARD_URL}
ENV NODE_ENV=${NODE_ENV}

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy remaining source files
COPY . .

# Build Next.js application
RUN npm run build

# Stage 2: Production image
FROM node:23-alpine

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --legacy-peer-deps --only=production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/node_modules ./node_modules

# Expose the port Next.js runs on
EXPOSE 20082

# Start Next.js in production mode
CMD ["npm", "start"]
