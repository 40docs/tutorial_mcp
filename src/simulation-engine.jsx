// ============================================================================
// MCP Glass Box Demo — Simulation Engine
// ============================================================================
// Single source of truth for the entire MCP demo. All UI components consume
// state from the useSimulation hook exported at the bottom of this file.
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// 1. SHARED CONSTANTS
// ============================================================================

export const COLORS = {
  host:      { bg: '#92400e', border: '#f59e0b', text: '#fbbf24', glow: 'rgba(245,158,11,0.4)' },
  client:    { bg: '#065f46', border: '#10b981', text: '#34d399', glow: 'rgba(16,185,129,0.4)' },
  server:    { bg: '#1e3a5f', border: '#3b82f6', text: '#60a5fa', glow: 'rgba(59,130,246,0.4)' },
  api:       { bg: '#581c87', border: '#a855f7', text: '#c084fc', glow: 'rgba(168,85,247,0.4)' },
  transport: { bg: '#374151', border: '#6b7280', text: '#9ca3af' },
};

export const COMPONENT_IDS = {
  HOST:          'host',
  MODEL:         'model',
  CLIENT_1:      'client-files',
  CLIENT_2:      'client-utils',
  SERVER_FILES:  'server-files',
  SERVER_UTILS:  'server-utils',
  API:           'anthropic-api',
  TRANSPORT_1:   'transport-1',
  TRANSPORT_2:   'transport-2',
};

const C = COMPONENT_IDS; // shorthand for step definitions

// ============================================================================
// 2. SIMULATED MCP CONFIGURATION
// ============================================================================

export const MCP_CONFIG = {
  mcpServers: {
    "file-system": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/documents"],
      transport: "stdio"
    },
    "utilities": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-utilities"],
      transport: "stdio"
    }
  }
};

// ============================================================================
// 3. SIMULATED FILE SYSTEM
// ============================================================================

export const SIMULATED_FS = {
  'notes.txt': 'Meeting notes from Monday: Discuss Q3 roadmap, review hiring pipeline, finalize budget.',
  'todo.txt':  '1. Ship MCP demo\n2. Review architecture doc\n3. Schedule team sync',
  'config.json': JSON.stringify(MCP_CONFIG, null, 2),
};

// ============================================================================
// 4. SERVER & TOOL DEFINITIONS (with real JSON Schema)
// ============================================================================

export const SERVER_DEFINITIONS = {
  'server-files': {
    name: 'File System',
    id: 'server-files',
    command: MCP_CONFIG.mcpServers['file-system'].command,
    args: MCP_CONFIG.mcpServers['file-system'].args,
    transport: 'stdio',
    capabilities: { tools: {} },
    protocolVersion: '2024-11-05',
    serverInfo: { name: 'filesystem-server', version: '1.0.0' },
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the file system',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to read' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file on the file system',
        inputSchema: {
          type: 'object',
          properties: {
            path:    { type: 'string', description: 'Path to the file to write' },
            content: { type: 'string', description: 'Content to write to the file' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_files',
        description: 'List files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory path to list', default: '.' }
          }
        }
      }
    ]
  },
  'server-utils': {
    name: 'Utilities',
    id: 'server-utils',
    command: MCP_CONFIG.mcpServers['utilities'].command,
    args: MCP_CONFIG.mcpServers['utilities'].args,
    transport: 'stdio',
    capabilities: { tools: {} },
    protocolVersion: '2024-11-05',
    serverInfo: { name: 'utilities-server', version: '1.0.0' },
    tools: [
      {
        name: 'get_current_time',
        description: 'Get the current date and time',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'count_words',
        description: 'Count the number of words in the provided text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to count words in' }
          },
          required: ['text']
        }
      },
      {
        name: 'calculate',
        description: 'Evaluate a mathematical expression',
        inputSchema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Mathematical expression to evaluate (e.g. "2 + 3 * 4")' }
          },
          required: ['expression']
        }
      }
    ]
  }
};

// Tool → server ownership map (built from definitions)
export const TOOL_OWNERSHIP = {};
Object.entries(SERVER_DEFINITIONS).forEach(([serverId, server]) => {
  server.tools.forEach(tool => {
    TOOL_OWNERSHIP[tool.name] = { serverId, serverName: server.name };
  });
});

// Anthropic API tool format (derived from server definitions)
export const API_TOOL_DEFINITIONS = Object.values(SERVER_DEFINITIONS).flatMap(server =>
  server.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))
);

// ============================================================================
// 5. JSON-RPC MESSAGE BUILDERS
// ============================================================================

let jsonRpcIdCounter = 0;
const resetJsonRpcId = () => { jsonRpcIdCounter = 0; };

const jsonRpcRequest = (method, params, id) => ({
  jsonrpc: '2.0',
  method,
  params,
  id: id ?? ++jsonRpcIdCounter,
});

const jsonRpcResponse = (result, id) => ({
  jsonrpc: '2.0',
  result,
  id,
});

const jsonRpcNotification = (method, params) => ({
  jsonrpc: '2.0',
  method,
  ...(params ? { params } : {}),
});

// ============================================================================
// 6. PRE-BUILT JSON-RPC MESSAGES (spec-accurate MCP protocol)
// ============================================================================

const JSONRPC = {
  // --- Client 1 (Files) initialization ---
  initializeRequest1: jsonRpcRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { roots: { listChanged: true }, sampling: {} },
    clientInfo: { name: 'claude-desktop', version: '1.4.0' }
  }, 1),

  initializeResponse1: jsonRpcResponse({
    protocolVersion: '2024-11-05',
    capabilities: { tools: { listChanged: true } },
    serverInfo: { name: 'filesystem-server', version: '1.0.0' }
  }, 1),

  initializedNotification1: jsonRpcNotification('notifications/initialized'),

  toolsListRequest1: jsonRpcRequest('tools/list', {}, 2),

  toolsListResponse1: jsonRpcResponse({
    tools: SERVER_DEFINITIONS['server-files'].tools
  }, 2),

  // --- Client 2 (Utilities) initialization ---
  initializeRequest2: jsonRpcRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { roots: { listChanged: true }, sampling: {} },
    clientInfo: { name: 'claude-desktop', version: '1.4.0' }
  }, 3),

  initializeResponse2: jsonRpcResponse({
    protocolVersion: '2024-11-05',
    capabilities: { tools: { listChanged: true } },
    serverInfo: { name: 'utilities-server', version: '1.0.0' }
  }, 3),

  initializedNotification2: jsonRpcNotification('notifications/initialized'),

  toolsListRequest2: jsonRpcRequest('tools/list', {}, 4),

  toolsListResponse2: jsonRpcResponse({
    tools: SERVER_DEFINITIONS['server-utils'].tools
  }, 4),

  // --- Act 3: tools/call for read_file ---
  toolsCallReadFile: jsonRpcRequest('tools/call', {
    name: 'read_file',
    arguments: { path: 'notes.txt' }
  }, 5),

  toolsCallReadFileResult: jsonRpcResponse({
    content: [
      { type: 'text', text: SIMULATED_FS['notes.txt'] }
    ]
  }, 5),

  // --- Act 4: tools/call for read_file (same) ---
  toolsCallReadFile2: jsonRpcRequest('tools/call', {
    name: 'read_file',
    arguments: { path: 'notes.txt' }
  }, 6),

  toolsCallReadFileResult2: jsonRpcResponse({
    content: [
      { type: 'text', text: SIMULATED_FS['notes.txt'] }
    ]
  }, 6),

  // --- Act 4: tools/call for count_words ---
  toolsCallCountWords: jsonRpcRequest('tools/call', {
    name: 'count_words',
    arguments: { text: SIMULATED_FS['notes.txt'] }
  }, 7),

  toolsCallCountWordsResult: jsonRpcResponse({
    content: [
      { type: 'text', text: '13' }
    ]
  }, 7),
};

// ============================================================================
// 7. PRE-BUILT API PAYLOADS (Anthropic Messages API format)
// ============================================================================

const API = {
  // --- Act 2: Simple question ---
  act2Request: {
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'What is the Model Context Protocol?' }
    ],
    tools: API_TOOL_DEFINITIONS,
  },

  act2Response: {
    id: 'msg_act2_001',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'The Model Context Protocol (MCP) is an open standard that enables AI applications to connect to external data sources and tools in a standardized way. Think of it like a USB-C port for AI — it provides a universal interface so any compatible AI host (like Claude Desktop) can communicate with any compatible server that provides tools, data, or prompt templates.\n\nMCP uses a client-server architecture where the host application maintains MCP clients that connect to MCP servers over JSON-RPC. This means tools and data sources can be swapped in and out without changing the AI application itself.',
      }
    ],
    model: 'claude-sonnet-4-5-20250514',
    stop_reason: 'end_turn',
    usage: { input_tokens: 342, output_tokens: 128 },
  },

  // --- Act 3: Tool question (read_file) ---
  act3Request1: {
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Read my notes.txt file' }
    ],
    tools: API_TOOL_DEFINITIONS,
  },

  act3Response1: {
    id: 'msg_act3_001',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_act3_read',
        name: 'read_file',
        input: { path: 'notes.txt' },
      }
    ],
    model: 'claude-sonnet-4-5-20250514',
    stop_reason: 'tool_use',
    usage: { input_tokens: 356, output_tokens: 42 },
  },

  act3Request2: {
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Read my notes.txt file' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_act3_read',
            name: 'read_file',
            input: { path: 'notes.txt' },
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_act3_read',
            content: SIMULATED_FS['notes.txt'],
          }
        ]
      }
    ],
    tools: API_TOOL_DEFINITIONS,
  },

  act3Response2: {
    id: 'msg_act3_002',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Here are your meeting notes from Monday:\n\n- Discuss Q3 roadmap\n- Review hiring pipeline\n- Finalize budget\n\nIt looks like you have three main agenda items to cover. Would you like me to help you prepare for any of these topics?',
      }
    ],
    model: 'claude-sonnet-4-5-20250514',
    stop_reason: 'end_turn',
    usage: { input_tokens: 412, output_tokens: 67 },
  },

  // --- Act 4: Chained tools (read_file → count_words) ---
  act4Request1: {
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Read my notes.txt, then count how many words are in it' }
    ],
    tools: API_TOOL_DEFINITIONS,
  },

  act4Response1: {
    id: 'msg_act4_001',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_act4_read',
        name: 'read_file',
        input: { path: 'notes.txt' },
      }
    ],
    model: 'claude-sonnet-4-5-20250514',
    stop_reason: 'tool_use',
    usage: { input_tokens: 368, output_tokens: 44 },
  },

  act4Request2: {
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Read my notes.txt, then count how many words are in it' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_act4_read',
            name: 'read_file',
            input: { path: 'notes.txt' },
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_act4_read',
            content: SIMULATED_FS['notes.txt'],
          }
        ]
      }
    ],
    tools: API_TOOL_DEFINITIONS,
  },

  act4Response2: {
    id: 'msg_act4_002',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_act4_count',
        name: 'count_words',
        input: { text: SIMULATED_FS['notes.txt'] },
      }
    ],
    model: 'claude-sonnet-4-5-20250514',
    stop_reason: 'tool_use',
    usage: { input_tokens: 498, output_tokens: 58 },
  },

  act4Request3: {
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Read my notes.txt, then count how many words are in it' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_act4_read',
            name: 'read_file',
            input: { path: 'notes.txt' },
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_act4_read',
            content: SIMULATED_FS['notes.txt'],
          }
        ]
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_act4_count',
            name: 'count_words',
            input: { text: SIMULATED_FS['notes.txt'] },
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_act4_count',
            content: '13',
          }
        ]
      }
    ],
    tools: API_TOOL_DEFINITIONS,
  },

  act4Response3: {
    id: 'msg_act4_003',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Here are your notes from Monday:\n\n"Meeting notes from Monday: Discuss Q3 roadmap, review hiring pipeline, finalize budget."\n\nThe document contains **13 words**. It\'s a concise set of agenda items covering three topics: the Q3 roadmap, hiring pipeline review, and budget finalization.',
      }
    ],
    model: 'claude-sonnet-4-5-20250514',
    stop_reason: 'end_turn',
    usage: { input_tokens: 587, output_tokens: 72 },
  },
};

// ============================================================================
// 8. ACT METADATA
// ============================================================================

export const ACT_METADATA = [
  null, // index 0 unused
  {
    number: 1,
    title: 'Configuration & Startup',
    subtitle: 'The Boot Sequence',
    description: 'Watch the host read its config, spawn MCP clients, connect to servers, and build a tool registry — all before a single message is sent.',
    watchFor: 'Notice how each server connection follows the same handshake pattern: initialize → capabilities → tools/list.',
  },
  {
    number: 2,
    title: 'A Simple Question',
    subtitle: 'No Tools Needed',
    description: 'See what happens when the model can answer without any tools — a clean baseline to contrast with the next act.',
    watchFor: 'The tool definitions are sent to the model even though none are used. The model always has the option.',
  },
  {
    number: 3,
    title: 'Tool-Triggered Question',
    subtitle: 'The Full Loop',
    description: 'The centerpiece: a question that triggers a tool call, routing through the full MCP pipeline.',
    watchFor: 'Pay attention to WHO does WHAT — the model requests, the host routes, the client translates, and the server executes.',
  },
  {
    number: 4,
    title: 'Chained Tool Calls',
    subtitle: 'The Loop Repeats',
    description: 'Two tools, two different servers, three API calls. The host\'s orchestration loop in full view.',
    watchFor: 'The second tool call goes to a DIFFERENT server, but the protocol is identical. The host just keeps looping.',
  },
];

// ============================================================================
// 9. STEP SEQUENCES — ALL FOUR ACTS
// ============================================================================

const STEPS = [

  // =========================================================================
  // ACT 1 — Configuration & Startup (12 steps)
  // =========================================================================

  {
    id: 'act1-step1',
    act: 1,
    phase: 'boot',
    label: 'Parse Configuration',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: MCP_CONFIG,
    narration: "The host application starts by reading its configuration file — claude_desktop_config.json. This file tells the host which MCP servers exist, how to launch them, and what transport to use. Everything begins here.",
    stateMutations: { systemPhase: 'booting', hostState: 'parsing_config' },
    chatUpdate: null,
  },
  {
    id: 'act1-step2',
    act: 1,
    phase: 'boot',
    label: 'Host Initializes',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The host application initializes its core components: the chat UI and the MCP client manager. The model/API connection is separate — the model is selected per chat, not during boot.",
    stateMutations: { hostState: 'initializing' },
    chatUpdate: null,
  },
  {
    id: 'act1-step3',
    act: 1,
    phase: 'boot',
    label: 'Spawn MCP Client #1',
    activeComponents: [C.HOST, C.CLIENT_1],
    messageFlow: null,
    message: null,
    narration: "The host reads the first server entry — 'file-system' — and spawns an MCP Client to manage this connection. The client is generic: the same code is used for every server. Only the configuration differs.",
    stateMutations: { client1State: 'spawned', server1State: 'disconnected' },
    chatUpdate: null,
  },
  {
    id: 'act1-step4',
    act: 1,
    phase: 'boot',
    label: 'Connect Transport (stdio)',
    activeComponents: [C.CLIENT_1, C.TRANSPORT_1, C.SERVER_FILES],
    messageFlow: { from: C.CLIENT_1, to: C.SERVER_FILES, type: 'transport', label: 'stdio connect' },
    message: null,
    narration: "Client #1 establishes a stdio transport — it spawns the server as a child process and connects via stdin/stdout. This is how local MCP servers work: they're separate processes that communicate over standard I/O pipes.",
    stateMutations: { transport1State: 'connected', server1State: 'connecting' },
    chatUpdate: null,
  },
  {
    id: 'act1-step5',
    act: 1,
    phase: 'boot',
    label: 'Initialize Handshake (Request)',
    activeComponents: [C.CLIENT_1, C.TRANSPORT_1, C.SERVER_FILES],
    messageFlow: { from: C.CLIENT_1, to: C.SERVER_FILES, type: 'jsonrpc_request', label: 'initialize' },
    message: JSONRPC.initializeRequest1,
    narration: "The client sends an 'initialize' request — a JSON-RPC 2.0 message. It tells the server: 'Here is my protocol version and the capabilities I support.' This is the first message in the MCP handshake.",
    stateMutations: { server1State: 'handshaking' },
    chatUpdate: null,
  },
  {
    id: 'act1-step6',
    act: 1,
    phase: 'boot',
    label: 'Initialize Handshake (Response)',
    activeComponents: [C.SERVER_FILES, C.TRANSPORT_1, C.CLIENT_1],
    messageFlow: { from: C.SERVER_FILES, to: C.CLIENT_1, type: 'jsonrpc_response', label: 'initialize result' },
    message: JSONRPC.initializeResponse1,
    narration: "The server responds with its own protocol version and capabilities. Both sides now know what the other supports. Notice the 'tools' capability — this server has tools to offer.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act1-step7',
    act: 1,
    phase: 'boot',
    label: 'Initialized Notification',
    activeComponents: [C.CLIENT_1, C.TRANSPORT_1, C.SERVER_FILES],
    messageFlow: { from: C.CLIENT_1, to: C.SERVER_FILES, type: 'jsonrpc_request', label: 'notifications/initialized' },
    message: JSONRPC.initializedNotification1,
    narration: "The client sends an 'initialized' notification — note this is a notification, not a request (no 'id' field, so no response expected). The handshake is complete. The connection is now fully established.",
    stateMutations: { server1State: 'ready' },
    chatUpdate: null,
  },
  {
    id: 'act1-step8',
    act: 1,
    phase: 'boot',
    label: 'Discover Tools (Server: Files)',
    activeComponents: [C.CLIENT_1, C.SERVER_FILES],
    messageFlow: { from: C.CLIENT_1, to: C.SERVER_FILES, type: 'jsonrpc_request', label: 'tools/list' },
    message: JSONRPC.toolsListRequest1,
    narration: "Now the client asks: 'What tools do you have?' It sends a tools/list request. The server will respond with every tool it offers, along with descriptions and JSON Schema definitions for their inputs.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act1-step9',
    act: 1,
    phase: 'boot',
    label: 'Tools Received (Files)',
    activeComponents: [C.SERVER_FILES, C.CLIENT_1, C.HOST],
    messageFlow: { from: C.SERVER_FILES, to: C.CLIENT_1, type: 'jsonrpc_response', label: 'tools/list result' },
    message: JSONRPC.toolsListResponse1,
    narration: "The File System server reports 3 tools: read_file, write_file, and list_files. Each comes with a complete JSON Schema describing its parameters. The client passes these to the host, which adds them to the tool registry.",
    stateMutations: { toolRegistryPartial: true, registeredTools: ['read_file', 'write_file', 'list_files'] },
    chatUpdate: null,
  },
  {
    id: 'act1-step10',
    act: 1,
    phase: 'boot',
    label: 'Spawn Client #2 & Connect',
    activeComponents: [C.HOST, C.CLIENT_2, C.TRANSPORT_2, C.SERVER_UTILS],
    messageFlow: { from: C.CLIENT_2, to: C.SERVER_UTILS, type: 'transport', label: 'stdio connect' },
    message: null,
    narration: "The host moves to the second config entry — 'utilities' — and repeats the same process: spawn a new MCP Client, establish a stdio transport, connect to the Utilities server. Same code, different config.",
    stateMutations: { client2State: 'spawned', transport2State: 'connected', server2State: 'connecting' },
    chatUpdate: null,
  },
  {
    id: 'act1-step11',
    act: 1,
    phase: 'boot',
    label: 'Handshake & Discover Tools (Utilities)',
    activeComponents: [C.CLIENT_2, C.TRANSPORT_2, C.SERVER_UTILS],
    messageFlow: { from: C.CLIENT_2, to: C.SERVER_UTILS, type: 'jsonrpc_request', label: 'initialize + tools/list' },
    message: {
      handshake: [JSONRPC.initializeRequest2, JSONRPC.initializeResponse2, JSONRPC.initializedNotification2],
      discovery: [JSONRPC.toolsListRequest2, JSONRPC.toolsListResponse2],
    },
    narration: "The same handshake plays out: initialize request, server response, initialized notification, then tools/list. The Utilities server reports 3 tools: get_current_time, count_words, and calculate. The protocol is identical — that's the beauty of a standardized spec.",
    stateMutations: { server2State: 'ready', registeredTools: ['read_file', 'write_file', 'list_files', 'get_current_time', 'count_words', 'calculate'] },
    chatUpdate: null,
  },
  {
    id: 'act1-step12',
    act: 1,
    phase: 'boot',
    label: 'System Ready',
    activeComponents: [C.HOST, C.MODEL, C.CLIENT_1, C.CLIENT_2, C.SERVER_FILES, C.SERVER_UTILS, C.API],
    messageFlow: null,
    message: null,
    narration: "Before you've typed a single message, the host has already connected to every server and built a complete tool registry: 6 tools across 2 servers. The system is primed and waiting. Everything from here is driven by your conversations with the model.",
    stateMutations: { systemPhase: 'idle', hostState: 'idle', toolRegistryPartial: false, toolRegistryComplete: true },
    chatUpdate: null,
  },

  // =========================================================================
  // ACT 2 — Simple Question, No Tools (5 steps)
  // =========================================================================

  {
    id: 'act2-step1',
    act: 2,
    phase: 'message',
    label: 'User Sends Message',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The user types: \"What is the Model Context Protocol?\" The host receives the message and prepares to forward it to the Anthropic API. No MCP servers are involved yet — this is between the host and the model.",
    stateMutations: { systemPhase: 'processing', hostState: 'building_request' },
    chatUpdate: { role: 'user', content: 'What is the Model Context Protocol?' },
  },
  {
    id: 'act2-step2',
    act: 2,
    phase: 'api_call',
    label: 'Build & Send API Request',
    activeComponents: [C.HOST, C.API],
    messageFlow: { from: C.HOST, to: C.API, type: 'api_request', label: 'API Request #1' },
    message: API.act2Request,
    narration: "The host builds an API request. Look carefully at what's included: the user's message in the messages array — and ALL 6 tool definitions in the tools array. Notice the tool definitions are ALWAYS sent, even when not needed. The model always has the option to use them.",
    stateMutations: { hostState: 'waiting_for_api', apiCallCount: 1 },
    chatUpdate: null,
  },
  {
    id: 'act2-step3',
    act: 2,
    phase: 'api_response',
    label: 'API Response: Text Only',
    activeComponents: [C.API, C.HOST],
    messageFlow: { from: C.API, to: C.HOST, type: 'api_response', label: 'Response: text' },
    message: API.act2Response,
    narration: "The model responds with plain text — no tool_use blocks. It decided this question can be answered from its training data alone. No tools needed. The stop_reason is 'end_turn', meaning the model is done.",
    stateMutations: { hostState: 'processing_response' },
    chatUpdate: null,
  },
  {
    id: 'act2-step4',
    act: 2,
    phase: 'render',
    label: 'Host Checks for Tool Use',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The host inspects the response: does it contain any tool_use blocks? No — just text. So the host skips the tool-routing loop entirely. In Act 3, this is where things get interesting.",
    stateMutations: { hostState: 'rendering' },
    chatUpdate: null,
  },
  {
    id: 'act2-step5',
    act: 2,
    phase: 'render',
    label: 'Render Response in Chat',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The text is rendered in the chat UI. One API call in, one response out. This is the simplest possible flow. Remember this baseline — in the next act, watch how the flow expands when tools get involved.",
    stateMutations: { systemPhase: 'idle', hostState: 'idle' },
    chatUpdate: { role: 'assistant', content: API.act2Response.content[0].text },
  },

  // =========================================================================
  // ACT 3 — Tool-Triggered Question: read_file (13 steps)
  // =========================================================================

  {
    id: 'act3-step1',
    act: 3,
    phase: 'message',
    label: 'User Sends Message',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The user types: \"Read my notes.txt file\" — a request that clearly requires a tool. But the host doesn't know that yet. It follows the same path as before: build an API request and let the model decide.",
    stateMutations: { systemPhase: 'processing', hostState: 'building_request' },
    chatUpdate: { role: 'user', content: 'Read my notes.txt file' },
  },
  {
    id: 'act3-step2',
    act: 3,
    phase: 'api_call',
    label: 'Build & Send API Request #1',
    activeComponents: [C.HOST, C.API],
    messageFlow: { from: C.HOST, to: C.API, type: 'api_request', label: 'API Request #1' },
    message: API.act3Request1,
    narration: "Same structure as Act 2: the user message plus all 6 tool definitions. The host sends the same kind of request as before. It's the model that will decide whether tools are needed — not the host.",
    stateMutations: { hostState: 'waiting_for_api', apiCallCount: 1 },
    chatUpdate: null,
  },
  {
    id: 'act3-step3',
    act: 3,
    phase: 'api_response',
    label: 'API Response: tool_use!',
    activeComponents: [C.API, C.HOST],
    messageFlow: { from: C.API, to: C.HOST, type: 'api_response', label: 'Response: tool_use' },
    message: API.act3Response1,
    narration: "This time the response is different. Instead of text, the model returns a tool_use block: { name: \"read_file\", input: { path: \"notes.txt\" } }. The model doesn't execute anything. It just says: \"I want to call this tool with these arguments.\" The stop_reason is 'tool_use', not 'end_turn'.",
    stateMutations: { hostState: 'processing_response' },
    chatUpdate: { role: 'assistant', type: 'tool_use', tool: 'read_file', args: { path: 'notes.txt' }, toolUseId: 'toolu_act3_read' },
  },
  {
    id: 'act3-step4',
    act: 3,
    phase: 'tool_routing',
    label: 'Host Interprets Response',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The HOST interprets the tool_use response. Not the client. Not the model. The HOST. It parses the API response, finds the tool_use block, and looks up 'read_file' in the tool registry to determine which MCP Client owns this tool.",
    stateMutations: { hostState: 'routing_tool' },
    chatUpdate: null,
  },
  {
    id: 'act3-step5',
    act: 3,
    phase: 'tool_routing',
    label: 'Look Up Tool Owner',
    activeComponents: [C.HOST, C.CLIENT_1],
    messageFlow: null,
    message: { lookup: 'read_file', result: { server: 'server-files', client: 'client-files' } },
    narration: "The host's tool registry says: 'read_file' belongs to the File System server, managed by MCP Client #1. The host now knows exactly where to route this request. The model has no idea MCP exists. It just sees tool definitions in its context.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act3-step6',
    act: 3,
    phase: 'tool_routing',
    label: 'Route to MCP Client #1',
    activeComponents: [C.HOST, C.CLIENT_1],
    messageFlow: { from: C.HOST, to: C.CLIENT_1, type: 'internal', label: 'Execute read_file' },
    message: null,
    narration: "The host tells MCP Client #1: execute 'read_file' with arguments { path: \"notes.txt\" }. The client will now translate this into the MCP wire protocol.",
    stateMutations: { client1State: 'sending' },
    chatUpdate: null,
  },
  {
    id: 'act3-step7',
    act: 3,
    phase: 'jsonrpc_request',
    label: 'JSON-RPC: tools/call',
    activeComponents: [C.CLIENT_1, C.TRANSPORT_1, C.SERVER_FILES],
    messageFlow: { from: C.CLIENT_1, to: C.SERVER_FILES, type: 'jsonrpc_request', label: 'tools/call' },
    message: JSONRPC.toolsCallReadFile,
    narration: "The client translates the request into a JSON-RPC 2.0 message: method 'tools/call' with the tool name and arguments. This message travels over the stdio transport — through the stdin pipe to the server process.",
    stateMutations: { client1State: 'waiting', server1State: 'executing' },
    chatUpdate: null,
  },
  {
    id: 'act3-step8',
    act: 3,
    phase: 'server_exec',
    label: 'Server Executes read_file',
    activeComponents: [C.SERVER_FILES],
    messageFlow: null,
    message: { action: 'read_file', path: 'notes.txt', result: SIMULATED_FS['notes.txt'] },
    narration: "The server does the real work. It actually reads 'notes.txt' from disk (or in our case, the simulated file system). The server is the only component that touches external resources. Everything else is protocol plumbing.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act3-step9',
    act: 3,
    phase: 'jsonrpc_response',
    label: 'JSON-RPC: Result',
    activeComponents: [C.SERVER_FILES, C.TRANSPORT_1, C.CLIENT_1, C.HOST],
    messageFlow: { from: C.SERVER_FILES, to: C.HOST, type: 'jsonrpc_response', label: 'tools/call result' },
    message: JSONRPC.toolsCallReadFileResult,
    narration: "The result travels back through the same chain: Server → stdio transport → Client → Host. The JSON-RPC response wraps the file contents in the standard MCP content format: an array of content blocks with type and text fields.",
    stateMutations: { server1State: 'ready', client1State: 'idle', hostState: 'injecting_result' },
    chatUpdate: null,
  },
  {
    id: 'act3-step10',
    act: 3,
    phase: 'result_injection',
    label: 'Inject tool_result',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "This is the step most people miss: the host injects the tool result into the conversation history as a tool_result message. It's formatted as a user-role message with type 'tool_result' and the matching tool_use_id. The user never typed this — the host creates it automatically.",
    stateMutations: { hostState: 'building_request' },
    chatUpdate: null,
  },
  {
    id: 'act3-step11',
    act: 3,
    phase: 'api_call',
    label: 'Build & Send API Request #2',
    activeComponents: [C.HOST, C.API],
    messageFlow: { from: C.HOST, to: C.API, type: 'api_request', label: 'API Request #2' },
    message: API.act3Request2,
    narration: "Now look at this second API request. The messages array has grown from 1 message to 3: (1) the original user message, (2) the assistant's tool_use response, and (3) the injected tool_result. The model is stateless — it needs the full history to continue. This is a SECOND API call for a single user question.",
    stateMutations: { hostState: 'waiting_for_api', apiCallCount: 2 },
    chatUpdate: null,
  },
  {
    id: 'act3-step12',
    act: 3,
    phase: 'api_response',
    label: 'API Response: Final Text',
    activeComponents: [C.API, C.HOST],
    messageFlow: { from: C.API, to: C.HOST, type: 'api_response', label: 'Response: text' },
    message: API.act3Response2,
    narration: "Now the model can see the file contents and formulate its answer. It returns plain text — stop_reason is 'end_turn'. No more tool calls. The orchestration loop can exit.",
    stateMutations: { hostState: 'rendering' },
    chatUpdate: null,
  },
  {
    id: 'act3-step13',
    act: 3,
    phase: 'render',
    label: 'Render Final Response',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The host renders the final response in the chat. From the user's perspective, they asked a question and got an answer. Behind the scenes: 2 API calls, 1 JSON-RPC round-trip, and the host acting as the invisible orchestrator. The host isn't an agent. It's a loop: send, check for tool_use, route, inject, repeat.",
    stateMutations: { systemPhase: 'idle', hostState: 'idle', apiCallCount: 0 },
    chatUpdate: { role: 'assistant', content: API.act3Response2.content[0].text },
  },

  // =========================================================================
  // ACT 4 — Chained Tool Calls: read_file → count_words (18 steps)
  // =========================================================================

  {
    id: 'act4-step1',
    act: 4,
    phase: 'message',
    label: 'User Sends Message',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The user types: \"Read my notes.txt, then count how many words are in it.\" This will require TWO tools from TWO different servers. But the host doesn't know that yet — it follows the same loop.",
    stateMutations: { systemPhase: 'processing', hostState: 'building_request' },
    chatUpdate: { role: 'user', content: 'Read my notes.txt, then count how many words are in it' },
  },
  {
    id: 'act4-step2',
    act: 4,
    phase: 'api_call',
    label: 'Build & Send API Request #1',
    activeComponents: [C.HOST, C.API],
    messageFlow: { from: C.HOST, to: C.API, type: 'api_request', label: 'API Request #1' },
    message: API.act4Request1,
    narration: "The host builds the first API request: user message + all 6 tools. Same as always. The model will figure out the plan.",
    stateMutations: { hostState: 'waiting_for_api', apiCallCount: 1 },
    chatUpdate: null,
  },
  {
    id: 'act4-step3',
    act: 4,
    phase: 'api_response',
    label: 'API Response: tool_use (read_file)',
    activeComponents: [C.API, C.HOST],
    messageFlow: { from: C.API, to: C.HOST, type: 'api_response', label: 'Response: tool_use' },
    message: API.act4Response1,
    narration: "The model's first move: read_file. It knows it needs the file contents before it can count words. The model is sequencing the operations — it'll request count_words after it sees the data.",
    stateMutations: { hostState: 'processing_response' },
    chatUpdate: { role: 'assistant', type: 'tool_use', tool: 'read_file', args: { path: 'notes.txt' }, toolUseId: 'toolu_act4_read' },
  },
  {
    id: 'act4-step4',
    act: 4,
    phase: 'tool_routing',
    label: 'Host Routes to Client #1',
    activeComponents: [C.HOST, C.CLIENT_1],
    messageFlow: { from: C.HOST, to: C.CLIENT_1, type: 'internal', label: 'Execute read_file' },
    message: null,
    narration: "The host interprets the tool_use, looks up read_file → File System server → Client #1. Same routing as Act 3. The loop is running.",
    stateMutations: { hostState: 'routing_tool', client1State: 'sending' },
    chatUpdate: null,
  },
  {
    id: 'act4-step5',
    act: 4,
    phase: 'jsonrpc_request',
    label: 'JSON-RPC: tools/call (read_file)',
    activeComponents: [C.CLIENT_1, C.TRANSPORT_1, C.SERVER_FILES],
    messageFlow: { from: C.CLIENT_1, to: C.SERVER_FILES, type: 'jsonrpc_request', label: 'tools/call' },
    message: JSONRPC.toolsCallReadFile2,
    narration: "Client #1 sends the JSON-RPC tools/call to the File System server. Same request format as Act 3 — the protocol doesn't change.",
    stateMutations: { client1State: 'waiting', server1State: 'executing' },
    chatUpdate: null,
  },
  {
    id: 'act4-step6',
    act: 4,
    phase: 'server_exec',
    label: 'Server Executes read_file',
    activeComponents: [C.SERVER_FILES],
    messageFlow: null,
    message: { action: 'read_file', path: 'notes.txt', result: SIMULATED_FS['notes.txt'] },
    narration: "The File System server reads notes.txt and returns the contents. Same execution, same result.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act4-step7',
    act: 4,
    phase: 'jsonrpc_response',
    label: 'Result Flows Back',
    activeComponents: [C.SERVER_FILES, C.TRANSPORT_1, C.CLIENT_1, C.HOST],
    messageFlow: { from: C.SERVER_FILES, to: C.HOST, type: 'jsonrpc_response', label: 'tools/call result' },
    message: JSONRPC.toolsCallReadFileResult2,
    narration: "The result flows back through the chain: Server → Client → Host. The host now has the file contents.",
    stateMutations: { server1State: 'ready', client1State: 'idle', hostState: 'injecting_result' },
    chatUpdate: null,
  },
  {
    id: 'act4-step8',
    act: 4,
    phase: 'api_call',
    label: 'Inject Result & Send API Request #2',
    activeComponents: [C.HOST, C.API],
    messageFlow: { from: C.HOST, to: C.API, type: 'api_request', label: 'API Request #2' },
    message: API.act4Request2,
    narration: "The host injects the tool_result and sends API Request #2. The messages array now has 3 entries. Will the model be done, or will it need another tool? Let's see...",
    stateMutations: { hostState: 'waiting_for_api', apiCallCount: 2 },
    chatUpdate: null,
  },
  {
    id: 'act4-step9',
    act: 4,
    phase: 'api_response',
    label: 'API Response: ANOTHER tool_use!',
    activeComponents: [C.API, C.HOST],
    messageFlow: { from: C.API, to: C.HOST, type: 'api_response', label: 'Response: tool_use' },
    message: API.act4Response2,
    narration: "The model isn't done! It returns ANOTHER tool_use — this time for 'count_words', passing the file contents it just received as the text argument. The model is chaining tools: read first, then count. The host's loop continues.",
    stateMutations: { hostState: 'processing_response' },
    chatUpdate: { role: 'assistant', type: 'tool_use', tool: 'count_words', args: { text: SIMULATED_FS['notes.txt'] }, toolUseId: 'toolu_act4_count' },
  },
  {
    id: 'act4-step10',
    act: 4,
    phase: 'tool_routing',
    label: 'Host Looks Up count_words',
    activeComponents: [C.HOST, C.CLIENT_2],
    messageFlow: null,
    message: { lookup: 'count_words', result: { server: 'server-utils', client: 'client-utils' } },
    narration: "The host looks up 'count_words' in the registry and finds it belongs to the Utilities server — managed by Client #2. Notice we're now talking to a DIFFERENT server. But the protocol is identical.",
    stateMutations: { hostState: 'routing_tool' },
    chatUpdate: null,
  },
  {
    id: 'act4-step11',
    act: 4,
    phase: 'tool_routing',
    label: 'Route to MCP Client #2',
    activeComponents: [C.HOST, C.CLIENT_2],
    messageFlow: { from: C.HOST, to: C.CLIENT_2, type: 'internal', label: 'Execute count_words' },
    message: null,
    narration: "The host routes the call to Client #2. Different client, different server, same pattern. This is why MCP uses a generic client — the routing code doesn't care which server handles the tool.",
    stateMutations: { client2State: 'sending' },
    chatUpdate: null,
  },
  {
    id: 'act4-step12',
    act: 4,
    phase: 'jsonrpc_request',
    label: 'JSON-RPC: tools/call (count_words)',
    activeComponents: [C.CLIENT_2, C.TRANSPORT_2, C.SERVER_UTILS],
    messageFlow: { from: C.CLIENT_2, to: C.SERVER_UTILS, type: 'jsonrpc_request', label: 'tools/call' },
    message: JSONRPC.toolsCallCountWords,
    narration: "Client #2 sends a JSON-RPC tools/call to the Utilities server. Same method, same format — only the tool name and arguments differ. The protocol is the contract.",
    stateMutations: { client2State: 'waiting', server2State: 'executing' },
    chatUpdate: null,
  },
  {
    id: 'act4-step13',
    act: 4,
    phase: 'server_exec',
    label: 'Server Executes count_words',
    activeComponents: [C.SERVER_UTILS],
    messageFlow: null,
    message: { action: 'count_words', text: SIMULATED_FS['notes.txt'], result: '13' },
    narration: "The Utilities server counts the words in the provided text: 13 words. Each server is a focused, single-purpose program. This one just does text and math utilities.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act4-step14',
    act: 4,
    phase: 'jsonrpc_response',
    label: 'Result Flows Back',
    activeComponents: [C.SERVER_UTILS, C.TRANSPORT_2, C.CLIENT_2, C.HOST],
    messageFlow: { from: C.SERVER_UTILS, to: C.HOST, type: 'jsonrpc_response', label: 'tools/call result' },
    message: JSONRPC.toolsCallCountWordsResult,
    narration: "The word count result flows back: Server → Client → Host. The host now has both pieces of data the model needs.",
    stateMutations: { server2State: 'ready', client2State: 'idle', hostState: 'injecting_result' },
    chatUpdate: null,
  },
  {
    id: 'act4-step15',
    act: 4,
    phase: 'api_call',
    label: 'Inject Result & Send API Request #3',
    activeComponents: [C.HOST, C.API],
    messageFlow: { from: C.HOST, to: C.API, type: 'api_request', label: 'API Request #3' },
    message: API.act4Request3,
    narration: "The host injects the second tool_result and builds API Request #3. Look at the messages array now — it has 5 entries: the original user message, two tool_use/tool_result pairs. The conversation history grows with every loop iteration. Three API calls for one user question.",
    stateMutations: { hostState: 'waiting_for_api', apiCallCount: 3 },
    chatUpdate: null,
  },
  {
    id: 'act4-step16',
    act: 4,
    phase: 'api_response',
    label: 'API Response: Final Text',
    activeComponents: [C.API, C.HOST],
    messageFlow: { from: C.API, to: C.HOST, type: 'api_response', label: 'Response: text' },
    message: API.act4Response3,
    narration: "Finally, the model has everything it needs. It returns a text response with the file contents and the word count. stop_reason: 'end_turn'. The orchestration loop can exit.",
    stateMutations: { hostState: 'rendering' },
    chatUpdate: null,
  },
  {
    id: 'act4-step17',
    act: 4,
    phase: 'render',
    label: 'Host Checks — No More Tool Calls',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The host checks: any more tool_use blocks? No — just text. The loop exits. Three API calls, two tool round-trips, two different servers, one seamless answer.",
    stateMutations: {},
    chatUpdate: null,
  },
  {
    id: 'act4-step18',
    act: 4,
    phase: 'render',
    label: 'Render Final Response',
    activeComponents: [C.HOST],
    messageFlow: null,
    message: null,
    narration: "The host renders the final answer. The user sees a simple response, but behind the scenes: 3 API calls, 2 JSON-RPC tool executions across 2 servers, and the host orchestrated every step. The host isn't an agent. It's a loop: send, check for tool_use, route, inject, repeat. All the intelligence is in the model's decisions.",
    stateMutations: { systemPhase: 'idle', hostState: 'idle', apiCallCount: 0 },
    chatUpdate: { role: 'assistant', content: API.act4Response3.content[0].text },
  },
];

// ============================================================================
// 10. STEP INDEX HELPERS
// ============================================================================

// Pre-compute act boundaries
const ACT_OFFSETS = {};
const ACT_LENGTHS = {};
[1, 2, 3, 4].forEach(act => {
  const firstIdx = STEPS.findIndex(s => s.act === act);
  const count = STEPS.filter(s => s.act === act).length;
  ACT_OFFSETS[act] = firstIdx;
  ACT_LENGTHS[act] = count;
});

// ============================================================================
// 11. INITIAL STATE
// ============================================================================

const INITIAL_STATE = {
  systemPhase: 'pre-boot',     // pre-boot | booting | idle | processing
  hostState: 'idle',
  client1State: 'none',        // none | spawned | sending | waiting | idle
  client2State: 'none',
  server1State: 'disconnected', // disconnected | connecting | handshaking | ready | executing
  server2State: 'disconnected',
  transport1State: 'disconnected',
  transport2State: 'disconnected',
  toolRegistryPartial: false,
  toolRegistryComplete: false,
  registeredTools: [],
  apiCallCount: 0,
};

// ============================================================================
// 12. useSimulation HOOK
// ============================================================================

export function useSimulation() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentAct, setCurrentAct] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2000); // ms per step
  const [conversationHistory, setConversationHistory] = useState([]);
  const [messageLog, setMessageLog] = useState([]);
  const [componentStates, setComponentStates] = useState({ ...INITIAL_STATE });

  const intervalRef = useRef(null);

  // Derived values
  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const actSteps = STEPS.filter(s => s.act === currentAct);
  const actStepIndex = currentStepIndex - (ACT_OFFSETS[currentAct] ?? 0);
  const totalSteps = STEPS.length;
  const totalActSteps = ACT_LENGTHS[currentAct] ?? 0;

  // Active components and message flow from current step
  const activeComponents = currentStep.activeComponents || [];
  const messageFlow = currentStep.messageFlow || null;

  // Build the full tool registry (when complete)
  const toolRegistry = componentStates.toolRegistryComplete
    ? API_TOOL_DEFINITIONS
    : componentStates.registeredTools
      ? API_TOOL_DEFINITIONS.filter(t => componentStates.registeredTools.includes(t.name))
      : [];

  // Apply state mutations for a given step index, building cumulatively from start
  const computeStateAtStep = useCallback((targetIndex) => {
    const state = { ...INITIAL_STATE };
    for (let i = 0; i <= targetIndex; i++) {
      const step = STEPS[i];
      if (step && step.stateMutations) {
        Object.assign(state, step.stateMutations);
      }
    }
    return state;
  }, []);

  // Compute conversation history up to a given step index
  const computeConversationAtStep = useCallback((targetIndex) => {
    const history = [];
    for (let i = 0; i <= targetIndex; i++) {
      const step = STEPS[i];
      if (step && step.chatUpdate) {
        history.push({ ...step.chatUpdate, stepId: step.id });
      }
    }
    return history;
  }, []);

  // Compute message log up to a given step index
  const computeMessageLogAtStep = useCallback((targetIndex) => {
    const log = [];
    for (let i = 0; i <= targetIndex; i++) {
      const step = STEPS[i];
      if (step && step.message && step.messageFlow) {
        log.push({
          stepId: step.id,
          act: step.act,
          phase: step.phase,
          label: step.label,
          flow: step.messageFlow,
          payload: step.message,
          timestamp: i,
        });
      }
    }
    return log;
  }, []);

  // Navigate to a specific step index
  const goToStep = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, STEPS.length - 1));
    const step = STEPS[clamped];
    setCurrentStepIndex(clamped);
    setCurrentAct(step.act);
    setComponentStates(computeStateAtStep(clamped));
    setConversationHistory(computeConversationAtStep(clamped));
    setMessageLog(computeMessageLogAtStep(clamped));
  }, [computeStateAtStep, computeConversationAtStep, computeMessageLogAtStep]);

  // Next / Previous
  const next = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStepIndex, goToStep]);

  const prev = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep]);

  // Go to act
  const goToAct = useCallback((act) => {
    const offset = ACT_OFFSETS[act];
    if (offset !== undefined) {
      goToStep(offset);
    }
  }, [goToStep]);

  // Play / Pause
  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Reset to beginning
  const reset = useCallback(() => {
    setIsPlaying(false);
    goToStep(0);
  }, [goToStep]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          const nextIdx = prev + 1;
          if (nextIdx >= STEPS.length) {
            setIsPlaying(false);
            return prev;
          }
          const step = STEPS[nextIdx];
          setCurrentAct(step.act);
          setComponentStates(computeStateAtStep(nextIdx));
          setConversationHistory(computeConversationAtStep(nextIdx));
          setMessageLog(computeMessageLogAtStep(nextIdx));
          return nextIdx;
        });
      }, playSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playSpeed, computeStateAtStep, computeConversationAtStep, computeMessageLogAtStep]);

  return {
    // Current state
    state: componentStates,
    currentStep,
    currentStepIndex,
    currentAct,
    actStepIndex,
    totalActSteps,

    // Step data
    steps: STEPS,
    actSteps,
    totalSteps,

    // Navigation
    next,
    prev,
    play,
    pause,
    togglePlay,
    goToAct,
    goToStep,
    reset,

    // Playback
    isPlaying,
    playSpeed,
    setPlaySpeed,

    // Data
    config: MCP_CONFIG,
    toolRegistry,
    toolOwnership: TOOL_OWNERSHIP,
    conversationHistory,
    messageLog,

    // Diagram inputs
    activeComponents,
    messageFlow,
    componentStates,

    // Server definitions
    serverDefinitions: SERVER_DEFINITIONS,
    apiToolDefinitions: API_TOOL_DEFINITIONS,

    // Act metadata
    actMetadata: ACT_METADATA,
    actOffsets: ACT_OFFSETS,
    actLengths: ACT_LENGTHS,

    // Simulated data
    simulatedFS: SIMULATED_FS,
  };
}

// ============================================================================
// 13. EXPORTS SUMMARY
// ============================================================================
// The following are exported for other agent components to consume:
//
// Constants:    COLORS, COMPONENT_IDS
// Config:       MCP_CONFIG, SIMULATED_FS
// Definitions:  SERVER_DEFINITIONS, TOOL_OWNERSHIP, API_TOOL_DEFINITIONS
// Metadata:     ACT_METADATA
// Hook:         useSimulation()
//
// The useSimulation hook is the primary interface. All UI components should
// call useSimulation() and read the returned state object.
// ============================================================================
