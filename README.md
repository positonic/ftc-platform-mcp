# FTC Platform MCP Server

A standalone Model Context Protocol (MCP) server for the FTC Platform that provides AI tools by proxying requests to the main platform's REST API.

## Architecture

This MCP server runs independently from the main Next.js application and communicates with it via HTTP API calls:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude AI     │───▶│  MCP Server     │───▶│  Vercel API     │
│   (MCP Client)  │    │  (This App)     │    │  (ftc-platform) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Why Separate Deployment?

- **Vercel Limitations**: Vercel Functions don't support WebSocket servers required for MCP
- **Long-lived Connections**: MCP sessions are persistent and bidirectional
- **Independent Scaling**: MCP server can scale separately from the main app
- **Clean Architecture**: Separation of concerns between web app and AI tools

## Available Tools

1. **test_connection** - Verify MCP server and API connectivity
2. **get_event_applications** - Fetch all applications for an event with complete data
3. **get_event_evaluations** - Get completed evaluations with scores and statistics
4. **get_evaluation_criteria** - Get scoring criteria categorized for AI understanding
5. **get_application_questions** - Get application question structure and metadata

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variables:
- `VERCEL_API_BASE_URL` - Base URL of your deployed FTC Platform API
- `MASTRA_API_KEY` - API key for authenticating with the Vercel API

## Development

### Prerequisites
- Node.js 20+
- Access to the FTC Platform API endpoints

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Start development server:
```bash
npm run dev
```

4. Test the connection:
```bash
# In another terminal, test via stdio
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm run dev
```

## Deployment

### Fly.io (Recommended)

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login and create app:
```bash
fly auth login
fly apps create ftc-platform-mcp
```

3. Set environment variables:
```bash
fly secrets set VERCEL_API_BASE_URL="https://your-app.vercel.app/api/mastra"
fly secrets set MASTRA_API_KEY="your-secret-key"
```

4. Deploy:
```bash
fly deploy
```

### Docker (Alternative)

```bash
# Build
docker build -t ftc-platform-mcp .

# Run locally
docker run -p 3001:3001 \
  -e VERCEL_API_BASE_URL="https://your-app.vercel.app/api/mastra" \
  -e MASTRA_API_KEY="your-secret-key" \
  ftc-platform-mcp
```

## Claude Configuration

After deploying, configure Claude to use your MCP server:

```json
// .mcp.json
{
  "mcpServers": {
    "ftc-platform": {
      "type": "stdio",
      "command": "ssh",
      "args": [
        "your-server.fly.dev",
        "node",
        "/app/dist/server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## API Authentication

The MCP server authenticates with the Vercel API using the same `MASTRA_API_KEY` that the main platform uses. This provides:

- **Reuse of existing auth** - No changes needed to Vercel API
- **Server-to-server security** - API key is stored securely on the MCP server
- **Access control** - Same permissions as the main platform

## Project Structure

```
src/
├── server.ts           # Main MCP server implementation
├── lib/
│   └── api-client.ts   # HTTP client for Vercel API calls
└── types/
    └── index.ts        # TypeScript type definitions

# Deployment configs
├── Dockerfile          # Docker container definition
├── fly.toml           # Fly.io deployment config
└── README.md          # This file
```

## Monitoring

### Health Checks
- HTTP endpoint: `http://your-app:3001/health`
- Fly.io automatically monitors and restarts unhealthy instances

### Logs
```bash
# Fly.io logs
fly logs

# Docker logs
docker logs container-id
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check `VERCEL_API_BASE_URL` is correct and accessible
   - Verify `MASTRA_API_KEY` is valid

2. **Tool Execution Errors**
   - Check Vercel API is responding correctly
   - Verify eventId parameters are valid UUIDs

3. **MCP Client Issues**
   - Ensure Claude has the correct MCP server configuration
   - Check stdio communication is working properly

### Debug Mode

Set environment variable for verbose logging:
```bash
NODE_ENV=development npm run dev
```