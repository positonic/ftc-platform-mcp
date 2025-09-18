#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { VercelApiClient } from './lib/api-client.js';

// Load environment variables
config();

/**
 * FTC Platform MCP Server
 * 
 * A standalone MCP server that provides AI tools for the FTC Platform
 * by proxying requests to the Vercel-hosted REST API endpoints.
 * 
 * This server runs independently from the main Next.js application
 * and can be deployed to services like Fly.io, Railway, or Render
 * that support WebSocket connections for real-time MCP communication.
 */
class FtcMcpServer {
  private server: Server;
  private apiClient: VercelApiClient;

  constructor() {
    // Initialize MCP Server
    this.server = new Server(
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

    // Initialize API client for Vercel endpoints
    this.apiClient = new VercelApiClient();

    // Verify configuration on startup
    this.validateConfiguration();

    // Set up MCP tool handlers
    this.setupToolHandlers();
    
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
    this.server.onerror = (error) => {
      console.error("[MCP Server Error]", error);
    };

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n[MCP Server] Received SIGINT, shutting down gracefully...");
      void this.server.close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n[MCP Server] Received SIGTERM, shutting down gracefully...");
      void this.server.close();
      process.exit(0);
    });

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

  private setupToolHandlers(): void {
    // Register available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
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

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log("[FTC Platform MCP Server] Started successfully");
    console.log("- Protocol: MCP over stdio");
    console.log("- Ready to receive tool calls from Claude AI");
    console.log("- API Proxy Target:", this.apiClient.getStatus().baseUrl);
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