# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend public folder
COPY --from=frontend-build /app/frontend/build ./public

EXPOSE 5000
ENV NODE_ENV=production
CMD ["npm", "start"]
