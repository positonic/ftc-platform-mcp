FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Expose HTTP port for MCP server
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV MCP_PORT=3001

# Health check using HTTP endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the MCP server
CMD ["npm", "start"]