// ============================================================================
// MCP Glass Box Demo — Architecture Diagram Component
// ============================================================================
// SVG-based animated diagram of the MCP architecture. Accepts state from
// the simulation engine and renders interactive, state-driven visualizations.
// ============================================================================

import React, { useMemo, useRef } from 'react';
import { COLORS, COMPONENT_IDS } from './simulation-engine';

const C = COMPONENT_IDS;

// ============================================================================
// 1. LAYOUT CONSTANTS
// ============================================================================

const COMP_RECTS = {
  [C.API]:          { x: 20,  y: 150, w: 150, h: 110, rx: 14 },
  [C.HOST]:         { x: 205, y: 30,  w: 460, h: 360, rx: 16 },
  [C.MODEL]:        { x: 225, y: 150, w: 160, h: 80,  rx: 10 },
  [C.CLIENT_1]:     { x: 430, y: 65,  w: 190, h: 110, rx: 10 },
  [C.CLIENT_2]:     { x: 430, y: 220, w: 190, h: 110, rx: 10 },
  [C.SERVER_FILES]: { x: 730, y: 45,  w: 235, h: 150, rx: 10 },
  [C.SERVER_UTILS]: { x: 730, y: 230, w: 235, h: 150, rx: 10 },
};

const COMP_META = {
  [C.HOST]:         { label: 'Host Application',  sub: '(Claude Desktop)',  ck: 'host' },
  [C.MODEL]:        { label: 'AI Model',           sub: 'Claude Sonnet',    ck: 'host' },
  [C.CLIENT_1]:     { label: 'MCP Client #1',      sub: 'Files Client',     ck: 'client' },
  [C.CLIENT_2]:     { label: 'MCP Client #2',      sub: 'Utils Client',     ck: 'client' },
  [C.API]:          { label: 'Anthropic API',       sub: 'Messages API',     ck: 'api' },
  [C.SERVER_FILES]: { label: 'MCP Server',          sub: 'File System',      ck: 'server' },
  [C.SERVER_UTILS]: { label: 'MCP Server',          sub: 'Utilities',        ck: 'server' },
};

// Static connection lines (always drawn between components)
const STATIC_LINES = [
  { id: 'host-api', p1: [205, 205], p2: [170, 205], ck: 'api',       c1: C.HOST,     c2: C.API },
  { id: 'c1-s1',    p1: [620, 120], p2: [730, 120], ck: 'transport', c1: C.CLIENT_1, c2: C.SERVER_FILES },
  { id: 'c2-s2',    p1: [620, 275], p2: [730, 275], ck: 'transport', c1: C.CLIENT_2, c2: C.SERVER_UTILS },
  { id: 'int-c1',   p1: [385, 190], p2: [430, 120], ck: 'host',      c1: C.MODEL,    c2: C.CLIENT_1, dashed: true },
  { id: 'int-c2',   p1: [385, 190], p2: [430, 275], ck: 'host',      c1: C.MODEL,    c2: C.CLIENT_2, dashed: true },
];

// Motion paths for animated message flow (keyed by "from->to")
const FLOW_PATHS = {
  'host->anthropic-api':         'M 205 205 L 170 205',
  'anthropic-api->host':         'M 170 205 L 205 205',
  'host->client-files':          'M 385 190 L 430 120',
  'host->client-utils':          'M 385 190 L 430 275',
  'client-files->server-files':  'M 620 120 L 730 120',
  'server-files->client-files':  'M 730 120 L 620 120',
  'client-utils->server-utils':  'M 620 275 L 730 275',
  'server-utils->client-utils':  'M 730 275 L 620 275',
  'server-files->host':          'M 730 120 L 620 120 L 430 120 L 385 190',
  'server-utils->host':          'M 730 275 L 620 275 L 430 275 L 385 190',
};

// Message flow type to packet color
const FLOW_COLORS = {
  api_request:      '#f59e0b',
  api_response:     '#f59e0b',
  jsonrpc_request:  '#10b981',
  jsonrpc_response: '#3b82f6',
  internal:         '#a855f7',
  transport:        '#6b7280',
};

// Component ID to componentStates key
const STATE_KEYS = {
  [C.HOST]:         'hostState',
  [C.CLIENT_1]:     'client1State',
  [C.CLIENT_2]:     'client2State',
  [C.SERVER_FILES]: 'server1State',
  [C.SERVER_UTILS]: 'server2State',
};

// Tool names owned by each server
const SERVER_TOOL_NAMES = {
  [C.SERVER_FILES]: ['read_file', 'write_file', 'list_files'],
  [C.SERVER_UTILS]: ['get_current_time', 'count_words', 'calculate'],
};

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

/** Determine if a component has appeared during boot sequence */
function isVisible(id, cs) {
  if (!cs.systemPhase || (cs.systemPhase !== 'pre-boot' && cs.systemPhase !== 'booting')) {
    return true; // After boot, everything visible
  }
  if (cs.systemPhase === 'pre-boot') return false;
  // During boot — derive from component states
  switch (id) {
    case C.HOST:         return true;
    case C.MODEL:        return cs.toolRegistryComplete;
    case C.CLIENT_1:     return cs.client1State !== 'none';
    case C.CLIENT_2:     return cs.client2State !== 'none';
    case C.SERVER_FILES: return cs.server1State !== 'disconnected';
    case C.SERVER_UTILS: return cs.server2State !== 'disconnected';
    case C.API:          return cs.toolRegistryComplete;
    default:             return false;
  }
}

/** Format a state value for display (e.g. "building_request" → "building request") */
function fmtState(raw) {
  if (!raw || raw === 'none' || raw === 'idle' || raw === 'pre-boot') return null;
  return raw.replace(/_/g, ' ');
}

/** Get animation duration based on path length */
function getFlowDur(from, to) {
  const key = `${from}->${to}`;
  if (key.startsWith('server') && key.endsWith('host')) return '1.2s';
  if (key.includes('anthropic')) return '0.7s';
  if (key.includes('->client')) return '0.5s';
  return '0.8s';
}

// ============================================================================
// 3. SUB-COMPONENTS
// ============================================================================

/** Renders a single component box (rect + labels + state badge) */
function CompBox({ id, active, opacity, stateText, isHost, isServer }) {
  const r = COMP_RECTS[id];
  const m = COMP_META[id];
  if (!r || !m) return null;
  const color = COLORS[m.ck];

  // Host gets special semi-transparent treatment
  const fillOpacity = isHost ? 0.12 : 0.3;
  const strokeW = active ? 2.5 : 1.5;
  const filter = active ? `url(#glow-${m.ck})` : 'none';

  const cx = r.x + r.w / 2;
  // Server boxes: left-align labels to make room for tools on the right
  const labelX = isServer ? r.x + 18 : cx;
  const labelAnchor = isServer ? 'start' : 'middle';
  const labelY = isHost ? r.y + 16 : r.y + r.h / 2 - 6;
  const subY = isHost ? r.y + 30 : r.y + r.h / 2 + 10;

  return (
    <g style={{ opacity, transition: 'opacity 0.3s ease' }}>
      <rect
        x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx}
        fill={color.bg} fillOpacity={fillOpacity}
        stroke={color.border} strokeWidth={strokeW}
        filter={filter}
        style={{ transition: 'stroke-width 0.3s ease, filter 0.3s ease' }}
      />
      <text
        x={labelX} y={labelY}
        textAnchor={labelAnchor} fill={color.text}
        fontSize={isHost ? 14 : 13} fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {m.label}
      </text>
      <text
        x={labelX} y={subY}
        textAnchor={labelAnchor} fill={color.text}
        fontSize={isHost ? 11 : 10} fontFamily="'Courier New', monospace"
        opacity={0.7}
      >
        {m.sub}
      </text>
      {/* State badge */}
      {stateText && (
        <g>
          <rect
            x={cx - stateText.length * 3.5 - 8}
            y={isHost ? r.y + r.h - 24 : r.y + r.h - 20}
            width={stateText.length * 7 + 16}
            height={17} rx={8.5}
            fill={color.bg} fillOpacity={0.9}
            stroke={color.border} strokeWidth={0.8}
          />
          <text
            x={cx}
            y={isHost ? r.y + r.h - 12 : r.y + r.h - 8}
            textAnchor="middle" fill={color.text}
            fontSize={9} fontFamily="'Courier New', monospace"
          >
            {stateText}
          </text>
        </g>
      )}
    </g>
  );
}

/** Renders tool name badges on a server component (right side) */
function ToolBadges({ serverId, tools }) {
  const r = COMP_RECTS[serverId];
  if (!r || !tools || tools.length === 0) return null;
  const color = COLORS.server;
  const dividerX = r.x + r.w * 0.45;
  const toolX = dividerX + 14;
  // Vertically center the tool list within the box
  const totalHeight = (tools.length - 1) * 15;
  const startY = r.y + r.h / 2 - totalHeight / 2 + 3;

  return (
    <g style={{ transition: 'opacity 0.5s ease' }}>
      {/* Vertical divider */}
      <line
        x1={dividerX} y1={r.y + 15}
        x2={dividerX} y2={r.y + r.h - 15}
        stroke={color.border} strokeWidth={0.5} opacity={0.3}
      />
      {tools.map((tool, i) => (
        <text
          key={tool}
          x={toolX} y={startY + i * 15}
          textAnchor="start" fill={color.text}
          fontSize={9} fontFamily="'Courier New', monospace"
          opacity={0.65}
        >
          {typeof tool === 'string' ? tool : tool.name}
        </text>
      ))}
    </g>
  );
}

/** Renders the animated message flow packet */
function FlowPacket({ messageFlow, flowId }) {
  if (!messageFlow) return null;
  const path = FLOW_PATHS[`${messageFlow.from}->${messageFlow.to}`];
  if (!path) return null;

  const color = FLOW_COLORS[messageFlow.type] || '#6b7280';
  const dur = getFlowDur(messageFlow.from, messageFlow.to);
  const label = messageFlow.label || '';

  return (
    <g key={`packet-${flowId}`}>
      {/* Outer glow */}
      <circle cx="0" cy="0" r="10" fill={color} opacity={0.25} filter="url(#glow-packet)">
        <animateMotion dur={dur} path={path} fill="freeze" repeatCount="1" calcMode="linear" />
      </circle>
      {/* Core dot */}
      <circle cx="0" cy="0" r="5" fill={color}>
        <animateMotion dur={dur} path={path} fill="freeze" repeatCount="1" calcMode="linear" />
      </circle>
      {/* Bright center */}
      <circle cx="0" cy="0" r="2" fill="#fff" opacity={0.8}>
        <animateMotion dur={dur} path={path} fill="freeze" repeatCount="1" calcMode="linear" />
      </circle>
      {/* Label */}
      {label && (
        <text
          x="0" y="-14"
          textAnchor="middle" fill={color}
          fontSize={9} fontWeight="bold"
          fontFamily="'Courier New', monospace"
        >
          <animateMotion dur={dur} path={path} fill="freeze" repeatCount="1" calcMode="linear" />
          {label}
        </text>
      )}
    </g>
  );
}

// ============================================================================
// 4. MAIN COMPONENT
// ============================================================================

export default function ArchitectureDiagram({
  activeComponents = [],
  messageFlow = null,
  componentStates = {},
  phase = '',
  bootProgress = 0,
  serverTools = {},
}) {
  const activeSet = useMemo(() => new Set(activeComponents), [activeComponents]);

  // Track flow changes for unique animation keys
  const flowIdRef = useRef(0);
  const prevFlowRef = useRef('');
  const flowSig = messageFlow ? `${messageFlow.from}|${messageFlow.to}|${messageFlow.label}` : '';
  if (flowSig !== prevFlowRef.current) {
    flowIdRef.current++;
    prevFlowRef.current = flowSig;
  }

  // Compute visibility for each component
  const vis = useMemo(() => {
    const v = {};
    Object.keys(COMP_RECTS).forEach(id => {
      v[id] = isVisible(id, componentStates);
    });
    return v;
  }, [componentStates]);

  // Compute opacity: active=1, visible-but-inactive=0.4, not-visible=0.08
  const getOpacity = (id) => {
    if (!vis[id]) return 0.08;
    if (activeSet.has(id)) return 1;
    return 0.4;
  };

  // Get state text for a component
  const getState = (id) => {
    const key = STATE_KEYS[id];
    return key ? fmtState(componentStates[key]) : null;
  };

  // Determine which tools to show on each server
  const fileTools = useMemo(() => {
    if (serverTools?.['server-files']) return serverTools['server-files'];
    const reg = componentStates.registeredTools || [];
    return SERVER_TOOL_NAMES[C.SERVER_FILES].filter(t => reg.includes(t));
  }, [serverTools, componentStates.registeredTools]);

  const utilTools = useMemo(() => {
    if (serverTools?.['server-utils']) return serverTools['server-utils'];
    const reg = componentStates.registeredTools || [];
    return SERVER_TOOL_NAMES[C.SERVER_UTILS].filter(t => reg.includes(t));
  }, [serverTools, componentStates.registeredTools]);

  // Connection line opacity
  const connOpacity = (c1, c2) => {
    if (activeSet.has(c1) && activeSet.has(c2)) return 0.8;
    if (vis[c1] && vis[c2]) return 0.3;
    return 0.06;
  };

  // Transport visibility
  const transportVis = vis[C.CLIENT_1] || vis[C.CLIENT_2] ||
                       vis[C.SERVER_FILES] || vis[C.SERVER_UTILS];

  // Component ordering: host first (bottom), then internals, then externals
  const innerIds = [C.MODEL, C.CLIENT_1, C.CLIENT_2];
  const outerIds = [C.API, C.SERVER_FILES, C.SERVER_UTILS];

  return (
    <div style={{
      width: '100%',
      background: '#1a1a2e',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <svg
        viewBox="0 10 1155 441"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ============================================================ */}
        {/* DEFS: Filters, markers, styles                               */}
        {/* ============================================================ */}
        <defs>
          {/* Glow filters for each color category */}
          {Object.entries(COLORS).filter(([k]) => k !== 'transport').map(([key, col]) => (
            <filter key={`glow-${key}`} id={`glow-${key}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
              <feFlood floodColor={col.border} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* Packet glow */}
          <filter id="glow-packet" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow markers */}
          <marker id="arrow-dim" viewBox="0 0 10 8" refX="9" refY="4"
            markerWidth="6" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 4 L 0 8 z" fill="#6b7280" opacity="0.5" />
          </marker>
          <marker id="arrow-api" viewBox="0 0 10 8" refX="9" refY="4"
            markerWidth="6" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 4 L 0 8 z" fill={COLORS.api.border} opacity="0.7" />
          </marker>
        </defs>

        {/* ============================================================ */}
        {/* BACKGROUND                                                   */}
        {/* ============================================================ */}
        <rect x="0" y="10" width="1155" height="441" fill="#1a1a2e" />

        {/* Subtle dot grid */}
        <g opacity="0.08">
          {Array.from({ length: 28 }, (_, i) =>
            Array.from({ length: 11 }, (_, j) => (
              <circle
                key={`dot-${i}-${j}`}
                cx={i * 40 + 20} cy={j * 40 + 10}
                r="1" fill="#fff"
              />
            ))
          )}
        </g>

        {/* ============================================================ */}
        {/* TRANSPORT BOUNDARY                                           */}
        {/* ============================================================ */}
        <g style={{
          opacity: transportVis ? 0.6 : 0.08,
          transition: 'opacity 0.3s ease',
        }}>
          <line
            x1="680" y1="40" x2="680" y2="390"
            stroke={COLORS.transport.border} strokeWidth="1.5"
            strokeDasharray="8 4"
          />
          <text
            x="680" y="215"
            textAnchor="middle" fill={COLORS.transport.text}
            fontSize="10" fontFamily="'Courier New', monospace"
            transform="rotate(-90, 680, 215)"
          >
            Transport Layer (stdio)
          </text>
        </g>

        {/* ============================================================ */}
        {/* STATIC CONNECTION LINES                                      */}
        {/* ============================================================ */}
        {STATIC_LINES.map(ln => {
          const [[x1, y1], [x2, y2]] = [ln.p1, ln.p2];
          const op = connOpacity(ln.c1, ln.c2);
          const col = COLORS[ln.ck]?.border || '#6b7280';
          return (
            <line
              key={ln.id}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={col} strokeWidth="1.5"
              strokeDasharray={ln.dashed ? '5 3' : 'none'}
              markerEnd={ln.id === 'host-api' ? 'url(#arrow-api)' : 'url(#arrow-dim)'}
              style={{
                opacity: op,
                transition: 'opacity 0.3s ease',
              }}
            />
          );
        })}

        {/* ============================================================ */}
        {/* HOST CONTAINER (rendered first, as background)               */}
        {/* ============================================================ */}
        <CompBox
          id={C.HOST}
          active={activeSet.has(C.HOST)}
          opacity={getOpacity(C.HOST)}
          stateText={getState(C.HOST)}
          isHost={true}
        />

        {/* ============================================================ */}
        {/* INTERNAL COMPONENTS (inside host)                            */}
        {/* ============================================================ */}
        {innerIds.map(id => (
          <CompBox
            key={id}
            id={id}
            active={activeSet.has(id)}
            opacity={getOpacity(id)}
            stateText={getState(id)}
            isHost={false}
          />
        ))}

        {/* ============================================================ */}
        {/* EXTERNAL COMPONENTS (servers, API)                           */}
        {/* ============================================================ */}
        {outerIds.map(id => (
          <CompBox
            key={id}
            id={id}
            active={activeSet.has(id)}
            opacity={getOpacity(id)}
            stateText={getState(id)}
            isHost={false}
            isServer={id === C.SERVER_FILES || id === C.SERVER_UTILS}
          />
        ))}

        {/* ============================================================ */}
        {/* TOOL BADGES on servers                                       */}
        {/* ============================================================ */}
        {vis[C.SERVER_FILES] && fileTools.length > 0 && (
          <g style={{ opacity: getOpacity(C.SERVER_FILES), transition: 'opacity 0.5s ease' }}>
            <ToolBadges serverId={C.SERVER_FILES} tools={fileTools} />
          </g>
        )}
        {vis[C.SERVER_UTILS] && utilTools.length > 0 && (
          <g style={{ opacity: getOpacity(C.SERVER_UTILS), transition: 'opacity 0.5s ease' }}>
            <ToolBadges serverId={C.SERVER_UTILS} tools={utilTools} />
          </g>
        )}

        {/* ============================================================ */}
        {/* "Inside Host" / "External" zone labels                       */}
        {/* ============================================================ */}
        <text x="640" y="403" fill={COLORS.host.text} fontSize="9"
          fontFamily="'Courier New', monospace" opacity="0.35"
          textAnchor="end">
          &#9668; inside host process
        </text>
        <text x="720" y="403" fill={COLORS.server.text} fontSize="9"
          fontFamily="'Courier New', monospace" opacity="0.35">
          external server processes &#9658;
        </text>

        {/* ============================================================ */}
        {/* ANIMATED MESSAGE FLOW PACKET                                 */}
        {/* ============================================================ */}
        {messageFlow && (
          <FlowPacket messageFlow={messageFlow} flowId={flowIdRef.current} />
        )}

        {/* ============================================================ */}
        {/* LEGEND (bottom-right)                                        */}
        {/* ============================================================ */}
        <g transform="translate(980, 55)" opacity="0.5">
          <text x="0" y="0" fill="#9ca3af" fontSize="10" fontWeight="600"
            fontFamily="system-ui, sans-serif">
            Message Types
          </text>
          {[
            { color: '#f59e0b', label: 'API call' },
            { color: '#10b981', label: 'JSON-RPC request' },
            { color: '#3b82f6', label: 'JSON-RPC response' },
            { color: '#a855f7', label: 'Internal routing' },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(0, ${16 + i * 18})`}>
              <circle cx="6" cy="-3" r="4" fill={item.color} />
              <text x="16" y="0" fill="#9ca3af" fontSize="9"
                fontFamily="'Courier New', monospace">
                {item.label}
              </text>
            </g>
          ))}

          <text x="0" y={16 + 4 * 18 + 8} fill="#9ca3af" fontSize="10" fontWeight="600"
            fontFamily="system-ui, sans-serif">
            Components
          </text>
          {[
            { color: COLORS.host.border, label: 'Host (amber)' },
            { color: COLORS.client.border, label: 'Client (green)' },
            { color: COLORS.server.border, label: 'Server (blue)' },
            { color: COLORS.api.border, label: 'API (purple)' },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(0, ${16 + 4 * 18 + 24 + i * 18})`}>
              <rect x="0" y="-8" width="12" height="8" rx="2"
                fill="none" stroke={item.color} strokeWidth="1.5" />
              <text x="18" y="0" fill="#9ca3af" fontSize="9"
                fontFamily="'Courier New', monospace">
                {item.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
