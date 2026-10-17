FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first for layer caching
COPY server/package*.json ./server/

# Install server dependencies
RUN cd server && npm ci --omit=dev

# Copy everything else
COPY . .

# Create data directories
RUN mkdir -p server/data/uploads server/data/logs

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

CMD ["node", "server/server.js"]
