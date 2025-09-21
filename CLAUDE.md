# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for the FTC Platform that provides AI tools by proxying requests to the main platform's REST API. The server runs independently from the main Next.js application and enables Claude AI to access FTC Platform data for application analysis and evaluation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude AI     │───▶│  HTTP MCP       │───▶│  Vercel API     │
│   (MCP Client)  │    │  Server         │    │  (ftc-platform) │
│                 │    │  (This App)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
    HTTP/SSE              Express.js              REST API
   JSON-RPC              Port 3001             Bearer Auth
```

The MCP server runs as an HTTP service using Server-Sent Events (SSE) transport, acting as a proxy between Claude AI and the FTC Platform's REST API endpoints.

## Development Commands

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Type checking without building
npm run typecheck

# Lint TypeScript files
npm run lint

# Run tests
npm test

# Start production server (after build)
npm start
```

## Code Structure

- **`src/server.ts`** - Main MCP server implementation with tool handlers
- **`src/lib/api-client.ts`** - HTTP client for making requests to Vercel API
- **`src/types/index.ts`** - TypeScript type definitions for all API responses

## Available MCP Tools

The server provides 5 main tools for AI analysis:

1. **test_connection** - Verify connectivity to FTC Platform API
2. **get_event_applications** - Fetch all applications for an event
3. **get_event_evaluations** - Get completed evaluations with scores
4. **get_evaluation_criteria** - Get scoring criteria and rubrics
5. **get_application_questions** - Get application question structure

All tools require an `eventId` parameter (UUID format) except `test_connection`.

## Environment Configuration

Required environment variables:
- `VERCEL_API_BASE_URL` - Base URL of the deployed FTC Platform API
- `MASTRA_API_KEY` - API key for authenticating with the Vercel API

Copy `.env.example` to `.env` and fill in the values for local development.

Additional HTTP server variables:
- `MCP_PORT` - Port for HTTP server (default: 3001)
- `MCP_CLIENT_TOKEN` - Optional client authentication token

## Technology Stack

- **Runtime**: Node.js 20+ with ES modules
- **Language**: TypeScript with strict mode
- **HTTP Server**: Express.js with CORS support
- **MCP SDK**: @modelcontextprotocol/sdk with StreamableHTTPServerTransport
- **HTTP Client**: node-fetch for API requests
- **Communication**: HTTP/SSE transport for MCP protocol

## API Integration

The server authenticates with the FTC Platform using Bearer token authentication. All API responses follow the standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}
```

Error handling includes detailed logging and structured error responses to Claude AI.

## Deployment

The server is designed for deployment to services that support long-lived processes and stdio communication:
- **Fly.io** (recommended) - Configuration in `fly.toml`
- **Docker** - Dockerfile included for containerization
- **Railway/Render** - Alternative deployment options

## Server Endpoints

- **Health Check**: `GET /health` - Server status and API connectivity
- **MCP Protocol**: `POST /mcp` - Main endpoint for MCP communication
- **Session Management**: Uses `mcp-session-id` header for stateful connections

## Testing the Server

```bash
# Start development server
npm run dev
# Server starts on http://localhost:3001

# Test health endpoint
curl http://localhost:3001/health

# Test MCP initialization (creates new session)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}'

# Test tools list (requires session ID from initialization)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'
```

## Claude Configuration

Configure Claude to connect via HTTP instead of stdio:

```json
{
  "mcpServers": {
    "ftc-platform": {
      "type": "fetch",
      "url": "https://your-mcp-server.fly.dev/mcp"
    }
  }
}
```