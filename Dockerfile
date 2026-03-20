FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

ARG VITE_ML_HOST=pei-ml
ARG VITE_DATA_STORAGE_HOST=data-storage
ARG VITE_MLFLOW_URL=/mlflow
ARG VITE_RAW_DATA_URL
ARG VITE_DATA_STORAGE_URL
ARG VITE_ML_URL
ARG VITE_POLICY_SERVICE_URL
ARG VITE_AVAILABLE_COMPONENTS

RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install 'serve' - a minimal static file server with SPA support
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/dist ./dist

# Expose port 5173 (to match your existing setup)
EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
