#!/bin/bash

# Test script for MCP server
# Usage: ./test-mcp.sh <server-url>
# Example: ./test-mcp.sh https://your-app.railway.app

SERVER_URL=${1:-"http://localhost:3030"}

echo "Testing MCP Server at: $SERVER_URL"
echo "=================================="

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$SERVER_URL/health" | jq '.' || echo "Health check failed"

echo -e "\n2. Testing MCP initialization..."

# Test 2: Initialize MCP session
INIT_RESPONSE=$(curl -s -X POST "$SERVER_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }')

echo "Init response: $INIT_RESPONSE"

# Extract session ID from response
SESSION_ID=$(echo "$INIT_RESPONSE" | jq -r '.result.sessionId // empty')

if [ -z "$SESSION_ID" ]; then
  echo "Failed to get session ID"
  exit 1
fi

echo "Session ID: $SESSION_ID"

echo -e "\n3. Testing tools list..."
# Test 3: List available tools
curl -s -X POST "$SERVER_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | jq '.'

echo -e "\n4. Testing connection tool..."
# Test 4: Test connection tool
curl -s -X POST "$SERVER_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "test_connection",
      "arguments": {}
    }
  }' | jq '.'