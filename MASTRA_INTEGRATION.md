# Integrating FTC Platform MCP Server with Mastra

This guide explains how to integrate the FTC Platform Model Context Protocol (MCP) server into your Mastra AI project to enable AI agents to access and analyze FTC Platform application data.

## Overview

The FTC Platform MCP server provides AI tools that proxy requests to the main FTC Platform REST API, enabling Claude AI and other MCP-compatible agents to:

- Retrieve event applications and evaluations
- Access scoring criteria and rubrics
- Analyze application data for insights
- Generate evaluation reports

## Quick Setup

**Production Server:** `https://ftc-platform-mcp-production.up.railway.app`

### Authenticated Access (Recommended)

For secure access, configure with authentication token:

```typescript
const ftcAgent = new Agent({
  name: 'FTC Application Analyzer',
  instructions: `
    You are an expert at analyzing FTC Platform applications and evaluations.
    Use the available MCP tools to retrieve data and generate insights.
  `,
  model: {
    provider: 'ANTHROPIC',
    name: 'claude-3-5-sonnet-20241022',
  },
  mcpServers: [{
    name: 'ftc-platform',
    url: 'https://ftc-platform-mcp-production.up.railway.app/mcp',
    transport: 'http',
    headers: {
      'Authorization': 'Bearer YOUR_CLIENT_TOKEN_HERE'
    }
  }]
});
```

### Unauthenticated Access (Development Only)

⚠️ **Not recommended for production use** - only if server has no client token configured:

```typescript
const ftcAgent = new Agent({
  name: 'FTC Application Analyzer',
  mcpServers: [{
    name: 'ftc-platform',
    url: 'https://ftc-platform-mcp-production.up.railway.app/mcp',
    transport: 'http'
  }]
});
```

## Available MCP Tools

### `test_connection`
Verify connectivity to the FTC Platform API.

```typescript
const connectionStatus = await agent.useTool('test_connection', {});
```

### `get_event_applications`
Fetch all applications for a specific event.

```typescript
const applications = await agent.useTool('get_event_applications', {
  eventId: 'uuid-of-your-event'
});
```

### `get_event_evaluations`
Get completed evaluations with scores for an event.

```typescript
const evaluations = await agent.useTool('get_event_evaluations', {
  eventId: 'uuid-of-your-event'
});
```

### `get_evaluation_criteria`
Retrieve scoring criteria and rubrics for an event.

```typescript
const criteria = await agent.useTool('get_evaluation_criteria', {
  eventId: 'uuid-of-your-event'
});
```

### `get_application_questions`
Get the application question structure for an event.

```typescript
const questions = await agent.useTool('get_application_questions', {
  eventId: 'uuid-of-your-event'
});
```

**Note:** All tools except `test_connection` require an `eventId` parameter in UUID format.

## Example Mastra Workflow

```typescript
import { Workflow, Step } from '@mastra/core';
import { z } from 'zod';

export const analyzeApplicationsWorkflow = new Workflow({
  name: 'Analyze FTC Applications',
  triggerSchema: z.object({
    eventId: z.string().uuid(),
    analysisType: z.enum(['quality', 'scoring', 'trends'])
  })
});

// Step 1: Fetch application data
analyzeApplicationsWorkflow.step('fetch-data', {
  agent: ftcAgent,
  instruction: `
    For the given eventId, retrieve:
    1. All applications using get_event_applications
    2. Evaluation criteria using get_evaluation_criteria
    3. Completed evaluations using get_event_evaluations
    
    Provide a summary of the data retrieved.
  `
});

// Step 2: Perform analysis
analyzeApplicationsWorkflow.step('analyze', {
  agent: ftcAgent,
  instruction: `
    Based on the retrieved data, perform the requested analysis:
    - For 'quality': Analyze application completeness and quality metrics
    - For 'scoring': Compare scores against criteria and identify patterns
    - For 'trends': Identify trends in application data and evaluation outcomes
    
    Generate a comprehensive report with actionable insights.
  `
});

// Step 3: Generate recommendations
analyzeApplicationsWorkflow.step('recommendations', {
  agent: ftcAgent,
  instruction: `
    Based on your analysis, provide specific recommendations for:
    1. Improving the application process
    2. Refining evaluation criteria
    3. Enhancing applicant guidance
    
    Format as actionable bullet points.
  `
});
```

## Security Features

The FTC Platform MCP server includes built-in security features:

### Authentication
- **Client Token Authentication**: Optional `MCP_CLIENT_TOKEN` environment variable
- **Bearer Token**: Pass token in `Authorization: Bearer <token>` header
- **Automatic Validation**: Server validates token on every request
- **Graceful Fallback**: If no token configured, server accepts all connections

### Rate Limiting
- **IP-based Limiting**: 100 requests per 15-minute window per IP
- **Standard Headers**: Returns rate limit info in `RateLimit-*` headers
- **Graceful Errors**: Returns JSON-RPC error format when limit exceeded

### CORS Protection
- **Explicit Headers**: Only allows specific headers and methods
- **Session Management**: Secure session ID handling for MCP protocol

## Error Handling

The MCP server provides structured error responses. Handle them in your Mastra workflows:

```typescript
try {
  const applications = await agent.useTool('get_event_applications', {
    eventId: 'invalid-id'
  });
} catch (error) {
  console.error('Failed to fetch applications:', error.message);
  // Implement fallback logic or user notification
}
```

## Health Monitoring

Monitor server status using the health endpoint:

```bash
curl https://ftc-platform-mcp-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T11:01:07.109Z",
  "server": "ftc-platform-mcp",
  "version": "1.0.0",
  "apiClient": {
    "configured": true,
    "baseUrl": "http://localhost:3000/api/mastra",
    "hasApiKey": true
  }
}
```

## Local Development

For local development, run the MCP server locally:

```bash
git clone <ftc-platform-mcp-repo>
cd ftc-platform-mcp
npm install

# Create .env file with your credentials
echo "VERCEL_API_BASE_URL=https://your-ftc-platform.vercel.app/api/mastra" > .env
echo "MASTRA_API_KEY=your_api_key" >> .env
echo "MCP_PORT=3030" >> .env
echo "MCP_CLIENT_TOKEN=your_secure_token_here" >> .env  # Optional but recommended

npm run dev
```

Then update your Mastra configuration to use localhost:

```typescript
mcpServers: [{
  name: 'ftc-platform',
  url: 'http://localhost:3030/mcp',
  transport: 'http',
  headers: {
    'Authorization': 'Bearer your_secure_token_here'  // Match your .env MCP_CLIENT_TOKEN
  }
}]
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Mastra Agent   │───▶│  FTC MCP        │───▶│  FTC Platform   │
│  (AI Workflow)  │    │  Server         │    │  API (Vercel)   │
│                 │    │  Railway        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
    MCP Protocol           Express.js/SSE           REST API
    JSON-RPC 2.0          HTTP Transport         Bearer Auth
```

## Best Practices

1. **Connection Management**: The MCP server handles session management automatically
2. **Rate Limiting**: Implement appropriate delays between API calls in workflows
3. **Error Recovery**: Build robust error handling into your Mastra workflows
4. **Data Validation**: Validate event IDs and parameters before making MCP tool calls
5. **Authentication**: The MCP server handles FTC Platform API authentication internally

## Support

- **MCP Server Issues**: Check server logs and `/health` endpoint
- **Mastra Integration**: Refer to Mastra documentation at https://mastra.ai/en/docs
- **API Issues**: Verify FTC Platform API credentials and connectivity

This integration enables powerful AI-driven analysis of FTC Platform data within your Mastra workflows, providing insights into application quality, evaluation effectiveness, and process improvements.