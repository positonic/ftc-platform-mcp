#!/usr/bin/env node

import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { VercelApiClient } from './lib/api-client.js';

// Load environment variables
config();

/**
 * FTC Platform MCP Server
 * 
 * A standalone HTTP MCP server that provides AI tools for the FTC Platform
 * by proxying requests to the Vercel-hosted REST API endpoints.
 * 
 * This server runs independently from the main Next.js application
 * and can be deployed to services like Fly.io, Railway, or Render
 * using HTTP transport for MCP communication.
 */
class FtcMcpServer {
  private app: express.Application;
  private apiClient: VercelApiClient;
  private transports: Map<string, StreamableHTTPServerTransport>;
  private port: number;

  constructor() {
    // Initialize Express app
    this.app = express();
    this.app.use(express.json());
    
    // Configure CORS with MCP session header exposure
    this.app.use(cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization'],
    }));

    // Initialize API client for Vercel endpoints
    this.apiClient = new VercelApiClient();
    
    // Store transports by session ID
    this.transports = new Map();
    
    // Get port from environment
    this.port = parseInt(process.env.MCP_PORT || '3001', 10);

    // Verify configuration on startup
    this.validateConfiguration();

    // Set up HTTP endpoints
    this.setupHttpEndpoints();
    
    // Set up error handling
    this.setupErrorHandling();
  }

  private validateConfiguration(): void {
    const status = this.apiClient.getStatus();
    
    if (!status.configured) {
      throw new Error(`
MCP Server configuration invalid:
- Base URL: ${status.baseUrl}
- Has API Key: ${status.hasApiKey}

Please ensure VERCEL_API_BASE_URL and MASTRA_API_KEY are set in your environment.
      `.trim());
    }

    console.log(`[MCP Server] Configuration valid:
- API Base URL: ${status.baseUrl}
- API Key: ${'*'.repeat(8)} (configured)
- Environment: ${process.env.NODE_ENV ?? 'development'}`);
  }

  private setupErrorHandling(): void {
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[MCP Server] Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MCP Server] Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private async shutdown(): Promise<void> {
    console.log('\n[MCP Server] Shutting down gracefully...');
    
    // Close all active transports
    for (const [sessionId, transport] of this.transports.entries()) {
      console.log(`[MCP Server] Closing session: ${sessionId}`);
      await transport.close();
    }
    this.transports.clear();
    
    // Close HTTP server
    return new Promise((resolve) => {
      this.httpServer?.close(() => {
        console.log('[MCP Server] HTTP server closed');
        resolve();
      });
    });
  }

  private createMcpServer(): Server {
    const server = new Server(
      {
        name: "ftc-platform-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers(server);
    return server;
  }

  private setupHttpEndpoints(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const status = this.apiClient.getStatus();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'ftc-platform-mcp',
        version: '1.0.0',
        apiClient: status,
        activeSessions: this.transports.size
      });
    });

    // Main MCP endpoint
    this.app.all('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string;
        let transport = sessionId ? this.transports.get(sessionId) : undefined;

        if (!transport && req.method === 'POST' && isInitializeRequest(req.body)) {
          // Create new transport for initialization request
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId: string) => {
              if (transport) {
                this.transports.set(newSessionId, transport);
              }
            }
          });

          transport.onclose = () => {
            if (transport?.sessionId) {
              this.transports.delete(transport.sessionId);
            }
          };

          const server = this.createMcpServer();
          await server.connect(transport);
        } else if (!transport && sessionId) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: { 
              code: -32000, 
              message: 'Invalid session ID or session expired' 
            },
            id: null,
          });
          return;
        } else if (!transport) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: { 
              code: -32000, 
              message: 'No session ID provided. Initialize first.' 
            },
            id: null,
          });
          return;
        }

        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('[MCP Server] Request handling error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: { 
            code: -32603, 
            message: 'Internal error',
            data: error instanceof Error ? error.message : 'Unknown error'
          },
          id: null,
        });
      }
    });
  }

  private setupToolHandlers(server: Server): void {
    // Register available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "test_connection",
            description: "Test connection to the FTC Platform API and verify the MCP server is working properly",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "get_event_applications",
            description: "Get all applications for a specific event with complete data for AI analysis and ranking. Returns applicant information, responses to all questions, and metadata for evaluation.",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The unique ID of the event to fetch applications for",
                },
              },
              required: ["eventId"],
            },
          },
          {
            name: "get_event_evaluations",
            description: "Get completed evaluations for applications in a specific event. Includes reviewer scores, comments, recommendations, and statistics for AI analysis of human evaluation patterns.",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The unique ID of the event to fetch evaluations for",
                },
              },
              required: ["eventId"],
            },
          },
          {
            name: "get_evaluation_criteria",
            description: "Get evaluation criteria categorized for AI understanding. Provides scoring rubrics, weights, and guidelines used by human reviewers for consistent AI application scoring.",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The unique ID of the event to get evaluation criteria for (provides context)",
                },
              },
              required: ["eventId"],
            },
          },
          {
            name: "get_application_questions",
            description: "Get application questions structure and metadata. Provides the complete question set, types, and requirements for understanding application data format and content.",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The unique ID of the event to fetch application questions for",
                },
              },
              required: ["eventId"],
            },
          },
        ],
      };
    });

    // Handle tool execution
    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        console.log(`[MCP Server] Executing tool: ${name}`, args);
        
        switch (name) {
          case "test_connection": {
            const result = await this.apiClient.testConnection();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    ...result,
                    mcpServer: "ftc-platform-mcp",
                    version: "1.0.0",
                    apiClient: this.apiClient.getStatus()
                  }, null, 2),
                },
              ],
            };
          }

          case "get_event_applications": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await this.apiClient.getEventApplications(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_event_evaluations": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await this.apiClient.getEventEvaluations(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_evaluation_criteria": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await this.apiClient.getEvaluationCriteria(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_application_questions": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await this.apiClient.getApplicationQuestions(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error(`[MCP Server] Tool execution failed: ${name}`, errorMessage);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                tool: name,
                timestamp: new Date().toISOString(),
                details: `Failed to execute MCP tool: ${name}`,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private httpServer?: import('http').Server;

  async start(): Promise<void> {
    this.httpServer = this.app.listen(this.port, () => {
      console.log(`[FTC Platform MCP Server] Started successfully`);
      console.log(`- Protocol: HTTP/SSE on port ${this.port}`);
      console.log(`- Health check: http://localhost:${this.port}/health`);
      console.log(`- MCP endpoint: http://localhost:${this.port}/mcp`);
      console.log(`- API Proxy Target: ${this.apiClient.getStatus().baseUrl}`);
      console.log('- Ready to receive MCP connections from Claude AI');
    });

    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[MCP Server] Received SIGINT');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[MCP Server] Received SIGTERM');
      await this.shutdown();
      process.exit(0);
    });
  }
}

// Start the server
async function main() {
  try {
    const server = new FtcMcpServer();
    await server.start();
  } catch (error) {
    console.error("Failed to start FTC Platform MCP Server:", error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}