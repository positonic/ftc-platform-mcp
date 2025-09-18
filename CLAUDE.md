# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for the FTC Platform that provides AI tools by proxying requests to the main platform's REST API. The server runs independently from the main Next.js application and enables Claude AI to access FTC Platform data for application analysis and evaluation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude AI     │───▶│  MCP Server     │───▶│  Vercel API     │
│   (MCP Client)  │    │  (This App)     │    │  (ftc-platform) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

The MCP server acts as a proxy between Claude AI and the FTC Platform's REST API endpoints, providing structured tools for AI analysis of applications and evaluations.

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

## Technology Stack

- **Runtime**: Node.js 20+ with ES modules
- **Language**: TypeScript with strict mode
- **MCP SDK**: @modelcontextprotocol/sdk for protocol implementation  
- **HTTP Client**: node-fetch for API requests
- **Communication**: stdio transport for MCP protocol

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

## Testing the Server

```bash
# Test via stdio (development)
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm run dev

# Test connection tool
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "test_connection", "arguments": {}}}' | npm run dev
```