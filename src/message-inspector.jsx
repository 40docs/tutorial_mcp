// ============================================================================
// MCP Glass Box Demo — Message Inspector, Log Panel & Config Viewer
// ============================================================================
// Agent 3: Developer-tools-style panels for inspecting every message flowing
// through the MCP simulation. Consumes state from useSimulation().
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { COLORS } from './simulation-engine.jsx';

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

const MONO_FONT = "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace";

const SYNTAX = {
  key:     '#60a5fa',
  string:  '#34d399',
  number:  '#fbbf24',
  boolean: '#f472b6',
  null:    '#9ca3af',
  brace:   '#d1d5db',
  colon:   '#9ca3af',
  comma:   '#6b7280',
};

const PANEL_BG = '#0f0f1e';
const PANEL_BORDER = '#2a2a4a';
const HIGHLIGHT_BG = 'rgba(96, 165, 250, 0.08)';
const CURRENT_BG = 'rgba(96, 165, 250, 0.15)';

// Map message flow types to display info
function getMessageDisplayInfo(logEntry) {
  if (!logEntry || !logEntry.flow) return { arrow: '→', color: '#9ca3af', label: 'Message', summary: '' };

  const { flow, phase, label } = logEntry;
  const type = flow.type;

  if (type === 'api_request') {
    return { arrow: '→', color: COLORS.api.text, label: label || 'API Request', summary: 'Host → Anthropic API' };
  }
  if (type === 'api_response') {
    return { arrow: '←', color: COLORS.api.text, label: label || 'API Response', summary: 'Anthropic API → Host' };
  }
  if (type === 'jsonrpc_request') {
    return { arrow: '→', color: COLORS.client.text, label: flow.label || 'JSON-RPC Request', summary: `${flow.from} → ${flow.to}` };
  }
  if (type === 'jsonrpc_response') {
    return { arrow: '←', color: COLORS.server.text, label: flow.label || 'JSON-RPC Response', summary: `${flow.from} → ${flow.to}` };
  }
  if (type === 'transport') {
    return { arrow: '→', color: COLORS.transport.text, label: flow.label || 'Transport', summary: 'Connection' };
  }
  if (type === 'internal') {
    return { arrow: '→', color: '#c084fc', label: flow.label || 'Internal', summary: `${flow.from} → ${flow.to}` };
  }
  return { arrow: '→', color: '#9ca3af', label: label || 'Message', summary: '' };
}

// ============================================================================
// JSON SYNTAX HIGHLIGHTER WITH COLLAPSIBLE NODES
// ============================================================================

function JsonNode({ keyName, value, depth, annotations, lineCounter, isNewInDiff }) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = depth * 16;

  const lineNum = useRef(lineCounter.current);
  useEffect(() => { lineNum.current = lineCounter.current; }, [lineCounter.current]);

  // Determine annotation for this key
  const annotation = annotations ? annotations[keyName] : null;

  // Render line number
  const LineNum = ({ num }) => (
    <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11, userSelect: 'none' }}>
      {num}
    </span>
  );

  const currentLine = ++lineCounter.current;

  if (value === null) {
    return (
      <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
        <LineNum num={currentLine} />
        {keyName !== undefined && (
          <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
        )}
        <span style={{ color: SYNTAX.null }}>null</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
        <LineNum num={currentLine} />
        {keyName !== undefined && (
          <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
        )}
        <span style={{ color: SYNTAX.boolean }}>{value.toString()}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
        <LineNum num={currentLine} />
        {keyName !== undefined && (
          <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
        )}
        <span style={{ color: SYNTAX.number }}>{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    const displayVal = value.length > 120 ? value.slice(0, 117) + '...' : value;
    return (
      <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'flex-start', minHeight: 20 }}>
        <LineNum num={currentLine} />
        {keyName !== undefined && (
          <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
        )}
        <span style={{ color: SYNTAX.string }}>"{displayVal}"</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
          <LineNum num={currentLine} />
          {keyName !== undefined && (
            <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
          )}
          <span style={{ color: SYNTAX.brace }}>[]</span>
        </div>
      );
    }

    const annotationBorder = annotation ? annotation.borderColor : null;
    const annotationLabel = annotation ? annotation.label : null;

    return (
      <div style={{
        borderLeft: annotationBorder ? `2px solid ${annotationBorder}` : undefined,
        marginLeft: annotationBorder ? -2 : undefined,
      }}>
        <div
          style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20, cursor: 'pointer' }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <LineNum num={currentLine} />
          <span style={{ color: '#6b7280', marginRight: 4, fontSize: 10, width: 12, textAlign: 'center' }}>
            {collapsed ? '▶' : '▼'}
          </span>
          {keyName !== undefined && (
            <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
          )}
          <span style={{ color: SYNTAX.brace }}>[</span>
          {collapsed && <span style={{ color: '#6b7280' }}> {value.length} items </span>}
          {collapsed && <span style={{ color: SYNTAX.brace }}>]</span>}
          {annotationLabel && (
            <span style={{
              marginLeft: 8, fontSize: 10, color: annotationBorder || '#9ca3af',
              background: `${annotationBorder || '#9ca3af'}15`, padding: '1px 6px', borderRadius: 3,
            }}>
              {annotationLabel}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            {value.map((item, i) => (
              <JsonNode
                key={i}
                value={item}
                depth={depth + 1}
                annotations={annotations}
                lineCounter={lineCounter}
                isNewInDiff={false}
              />
            ))}
            <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
              <LineNum num={++lineCounter.current} />
              <span style={{ color: SYNTAX.brace }}>]</span>
            </div>
          </>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
          <LineNum num={currentLine} />
          {keyName !== undefined && (
            <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
          )}
          <span style={{ color: SYNTAX.brace }}>{'{}'}</span>
        </div>
      );
    }

    const annotationBorder = annotation ? annotation.borderColor : null;
    const annotationLabel = annotation ? annotation.label : null;

    return (
      <div style={{
        borderLeft: annotationBorder ? `2px solid ${annotationBorder}` : undefined,
        marginLeft: annotationBorder ? -2 : undefined,
      }}>
        <div
          style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20, cursor: 'pointer' }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <LineNum num={currentLine} />
          <span style={{ color: '#6b7280', marginRight: 4, fontSize: 10, width: 12, textAlign: 'center' }}>
            {collapsed ? '▶' : '▼'}
          </span>
          {keyName !== undefined && (
            <><span style={{ color: SYNTAX.key }}>"{keyName}"</span><span style={{ color: SYNTAX.colon }}>: </span></>
          )}
          <span style={{ color: SYNTAX.brace }}>{'{'}</span>
          {collapsed && <span style={{ color: '#6b7280' }}> {keys.length} keys </span>}
          {collapsed && <span style={{ color: SYNTAX.brace }}>{'}'}</span>}
          {annotationLabel && (
            <span style={{
              marginLeft: 8, fontSize: 10, color: annotationBorder || '#9ca3af',
              background: `${annotationBorder || '#9ca3af'}15`, padding: '1px 6px', borderRadius: 3,
            }}>
              {annotationLabel}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            {keys.map((k) => (
              <JsonNode
                key={k}
                keyName={k}
                value={value[k]}
                depth={depth + 1}
                annotations={annotations}
                lineCounter={lineCounter}
                isNewInDiff={false}
              />
            ))}
            <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', minHeight: 20 }}>
              <LineNum num={++lineCounter.current} />
              <span style={{ color: SYNTAX.brace }}>{'}'}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ============================================================================
// PAYLOAD INSPECTOR
// ============================================================================

export function PayloadInspector({ message, previousApiRequest }) {
  const [copied, setCopied] = useState(false);
  const lineCounter = useRef(0);

  const payload = message ? (message.payload || message) : null;

  const handleCopy = useCallback(() => {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [payload]);

  if (!message) {
    return (
      <div style={{
        background: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 6,
        padding: 16,
        fontFamily: MONO_FONT,
        fontSize: 12,
        color: '#6b7280',
        minHeight: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        Select a message to inspect its payload
      </div>
    );
  }

  // Build annotation map for special fields
  const annotations = {
    tool_use: { borderColor: '#f59e0b', label: 'Model requesting tool call' },
    tool_result: { borderColor: '#10b981', label: 'Injected by host' },
    tools: { borderColor: '#3b82f6', label: 'Discovered from MCP servers during boot' },
    content: null, // we'll annotate content items individually below
  };

  // Check if this is an API request with messages array — detect new messages for diff
  const isDiffMode = previousApiRequest && payload.messages && previousApiRequest.messages;
  const prevMessageCount = isDiffMode ? previousApiRequest.messages.length : 0;

  lineCounter.current = 0;

  return (
    <div style={{
      background: PANEL_BG,
      border: `1px solid ${PANEL_BORDER}`,
      borderRadius: 6,
      overflow: 'hidden',
      fontFamily: MONO_FONT,
      fontSize: 12,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${PANEL_BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(42,42,74,0.3)',
      }}>
        <span style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
          PAYLOAD INSPECTOR
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(96,165,250,0.1)',
            border: `1px solid ${copied ? '#34d399' : '#3b82f6'}`,
            borderRadius: 4,
            color: copied ? '#34d399' : '#60a5fa',
            fontSize: 10,
            padding: '3px 8px',
            cursor: 'pointer',
            fontFamily: MONO_FONT,
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* JSON content */}
      <div style={{
        padding: '8px 4px',
        maxHeight: 360,
        overflowY: 'auto',
        overflowX: 'hidden',
        lineHeight: 1.5,
      }}>
        {/* Diff badge for API Request #2+ */}
        {isDiffMode && (
          <div style={{
            margin: '0 8px 8px 8px',
            padding: '4px 8px',
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 4,
            fontSize: 11,
            color: '#34d399',
          }}>
            Diff view: {payload.messages.length - prevMessageCount} new message{payload.messages.length - prevMessageCount !== 1 ? 's' : ''} since previous request
          </div>
        )}

        {/* Render JSON with special handling for messages array diff */}
        {isDiffMode ? (
          <DiffJsonView
            payload={payload}
            prevMessageCount={prevMessageCount}
            annotations={annotations}
          />
        ) : (
          <JsonNode
            value={payload}
            depth={0}
            annotations={annotations}
            lineCounter={lineCounter}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DIFF JSON VIEW — highlights new messages in the messages array
// ============================================================================

function DiffJsonView({ payload, prevMessageCount, annotations }) {
  const lineCounter = useRef(0);

  // Render the object keys manually so we can special-case "messages"
  const keys = Object.keys(payload);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 20 }}>
        <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
          {++lineCounter.current}
        </span>
        <span style={{ color: SYNTAX.brace }}>{'{'}</span>
      </div>
      {keys.map((k) => {
        if (k === 'messages' && Array.isArray(payload[k])) {
          return (
            <DiffMessagesArray
              key={k}
              messages={payload[k]}
              prevMessageCount={prevMessageCount}
              lineCounter={lineCounter}
              annotations={annotations}
            />
          );
        }
        return (
          <JsonNode
            key={k}
            keyName={k}
            value={payload[k]}
            depth={1}
            annotations={annotations}
            lineCounter={lineCounter}
          />
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 20 }}>
        <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
          {++lineCounter.current}
        </span>
        <span style={{ color: SYNTAX.brace }}>{'}'}</span>
      </div>
    </div>
  );
}

function DiffMessagesArray({ messages, prevMessageCount, lineCounter, annotations }) {
  const [collapsed, setCollapsed] = useState(false);
  const currentLine = ++lineCounter.current;

  return (
    <div>
      <div
        style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', minHeight: 20, cursor: 'pointer' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
          {currentLine}
        </span>
        <span style={{ color: '#6b7280', marginRight: 4, fontSize: 10, width: 12, textAlign: 'center' }}>
          {collapsed ? '▶' : '▼'}
        </span>
        <span style={{ color: SYNTAX.key }}>"messages"</span>
        <span style={{ color: SYNTAX.colon }}>: </span>
        <span style={{ color: SYNTAX.brace }}>[</span>
        {collapsed && <span style={{ color: '#6b7280' }}> {messages.length} items </span>}
        {collapsed && <span style={{ color: SYNTAX.brace }}>]</span>}
      </div>
      {!collapsed && (
        <>
          {messages.map((msg, i) => {
            const isNew = i >= prevMessageCount;
            const msgAnnotation = getMsgAnnotation(msg);
            return (
              <div
                key={i}
                style={{
                  borderLeft: isNew ? '3px solid #34d399' : msgAnnotation ? `2px solid ${msgAnnotation.borderColor}` : undefined,
                  marginLeft: isNew ? -1 : undefined,
                  background: isNew ? 'rgba(52,211,153,0.06)' : undefined,
                  position: 'relative',
                }}
              >
                {isNew && (
                  <span style={{
                    position: 'absolute',
                    right: 8,
                    top: 2,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#34d399',
                    background: 'rgba(52,211,153,0.15)',
                    padding: '1px 5px',
                    borderRadius: 3,
                    letterSpacing: 0.5,
                  }}>
                    +NEW
                  </span>
                )}
                {msgAnnotation && (
                  <span style={{
                    position: 'absolute',
                    right: isNew ? 52 : 8,
                    top: 2,
                    fontSize: 9,
                    color: msgAnnotation.borderColor,
                    background: `${msgAnnotation.borderColor}15`,
                    padding: '1px 5px',
                    borderRadius: 3,
                  }}>
                    {msgAnnotation.label}
                  </span>
                )}
                <JsonNode
                  value={msg}
                  depth={2}
                  annotations={annotations}
                  lineCounter={lineCounter}
                />
              </div>
            );
          })}
          <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', minHeight: 20 }}>
            <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
              {++lineCounter.current}
            </span>
            <span style={{ color: SYNTAX.brace }}>]</span>
          </div>
        </>
      )}
    </div>
  );
}

function getMsgAnnotation(msg) {
  if (!msg) return null;
  if (msg.role === 'user' && Array.isArray(msg.content)) {
    const hasToolResult = msg.content.some(c => c.type === 'tool_result');
    if (hasToolResult) return { borderColor: '#10b981', label: 'Tool result (injected)' };
  }
  if (msg.role === 'user' && typeof msg.content === 'string') {
    return { borderColor: '#9ca3af', label: 'User message' };
  }
  if (msg.role === 'assistant' && Array.isArray(msg.content)) {
    const hasToolUse = msg.content.some(c => c.type === 'tool_use');
    if (hasToolUse) return { borderColor: '#f59e0b', label: 'Assistant (tool_use)' };
    return { borderColor: '#c084fc', label: 'Assistant response' };
  }
  if (msg.role === 'assistant' && typeof msg.content === 'string') {
    return { borderColor: '#c084fc', label: 'Assistant response' };
  }
  return null;
}

// ============================================================================
// MESSAGE LOG
// ============================================================================

export function MessageLog({ messageLog, currentStepIndex, onSelectMessage }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const scrollRef = useRef(null);
  const currentRef = useRef(null);

  // Find which log entry corresponds to the current step
  const currentLogIdx = useMemo(() => {
    if (!messageLog || messageLog.length === 0) return -1;
    // Find the latest log entry whose timestamp <= currentStepIndex
    let latest = -1;
    for (let i = 0; i < messageLog.length; i++) {
      if (messageLog[i].timestamp <= currentStepIndex) latest = i;
    }
    return latest;
  }, [messageLog, currentStepIndex]);

  // Auto-scroll to current message
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentLogIdx]);

  const handleSelect = useCallback((idx) => {
    setSelectedIdx(idx);
    if (onSelectMessage && messageLog[idx]) {
      onSelectMessage(messageLog[idx]);
    }
  }, [onSelectMessage, messageLog]);

  if (!messageLog || messageLog.length === 0) {
    return (
      <div style={{
        background: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 6,
        padding: 16,
        fontFamily: MONO_FONT,
        fontSize: 12,
        color: '#6b7280',
        minHeight: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        No messages yet — step forward to see the flow
      </div>
    );
  }

  return (
    <div style={{
      background: PANEL_BG,
      border: `1px solid ${PANEL_BORDER}`,
      borderRadius: 6,
      overflow: 'hidden',
      fontFamily: MONO_FONT,
      fontSize: 12,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${PANEL_BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(42,42,74,0.3)',
      }}>
        <span style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
          MESSAGE LOG
        </span>
        <span style={{ color: '#6b7280', fontSize: 10 }}>
          {messageLog.length} message{messageLog.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrolling log */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: 240,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {messageLog.map((entry, idx) => {
          const info = getMessageDisplayInfo(entry);
          const isCurrent = idx === currentLogIdx;
          const isSelected = idx === selectedIdx;

          return (
            <div
              key={entry.stepId + '-' + idx}
              ref={isCurrent ? currentRef : null}
              onClick={() => handleSelect(idx)}
              style={{
                padding: '6px 12px',
                borderLeft: `3px solid ${info.color}`,
                background: isCurrent ? CURRENT_BG : isSelected ? HIGHLIGHT_BG : 'transparent',
                cursor: 'pointer',
                borderBottom: `1px solid ${PANEL_BORDER}`,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!isCurrent && !isSelected) e.currentTarget.style.background = 'rgba(96,165,250,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent && !isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Direction arrow */}
              <span style={{
                color: info.color,
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                width: 16,
                textAlign: 'center',
              }}>
                {info.arrow}
              </span>

              {/* Label & summary */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: info.color,
                  fontWeight: 600,
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {info.label}
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {info.summary}
                </div>
              </div>

              {/* Act badge */}
              <span style={{
                fontSize: 9,
                color: '#9ca3af',
                background: 'rgba(156,163,175,0.1)',
                padding: '1px 5px',
                borderRadius: 3,
                flexShrink: 0,
              }}>
                Act {entry.act}
              </span>

              {/* Current indicator */}
              {isCurrent && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#60a5fa',
                  boxShadow: '0 0 6px rgba(96,165,250,0.6)',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG VIEWER
// ============================================================================

export function ConfigViewer({ config, isExpanded, onToggle }) {
  const lineCounter = useRef(0);

  // Annotations for config fields
  const configAnnotations = {
    mcpServers: { borderColor: '#3b82f6', label: 'This is where you define MCP servers' },
  };

  return (
    <div style={{
      background: PANEL_BG,
      border: `1px solid ${PANEL_BORDER}`,
      borderRadius: 6,
      overflow: 'hidden',
      fontFamily: MONO_FONT,
      fontSize: 12,
    }}>
      {/* Header — clickable toggle */}
      <div
        onClick={onToggle}
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'rgba(42,42,74,0.3)',
          borderBottom: isExpanded ? `1px solid ${PANEL_BORDER}` : 'none',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42,42,74,0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(42,42,74,0.3)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#6b7280', fontSize: 10 }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
            CONFIG VIEWER
          </span>
          <span style={{
            fontSize: 10,
            color: '#9ca3af',
            fontStyle: 'italic',
          }}>
            claude_desktop_config.json
          </span>
        </div>
        {!isExpanded && (
          <span style={{ color: '#6b7280', fontSize: 10 }}>
            Click to expand
          </span>
        )}
      </div>

      {/* Collapsible content */}
      {isExpanded && config && (
        <div style={{
          padding: '8px 4px',
          maxHeight: 300,
          overflowY: 'auto',
          lineHeight: 1.5,
        }}>
          {(() => {
            lineCounter.current = 0;
            return null;
          })()}

          {/* Render top-level object */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 20 }}>
            <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
              {++lineCounter.current}
            </span>
            <span style={{ color: SYNTAX.brace }}>{'{'}</span>
          </div>

          {Object.keys(config).map((key) => {
            const annotation = configAnnotations[key];
            if (key === 'mcpServers' && typeof config[key] === 'object') {
              return (
                <ConfigServersSection
                  key={key}
                  servers={config[key]}
                  annotation={annotation}
                  lineCounter={lineCounter}
                />
              );
            }
            return (
              <JsonNode
                key={key}
                keyName={key}
                value={config[key]}
                depth={1}
                annotations={configAnnotations}
                lineCounter={lineCounter}
              />
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', minHeight: 20 }}>
            <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
              {++lineCounter.current}
            </span>
            <span style={{ color: SYNTAX.brace }}>{'}'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigServersSection({ servers, annotation, lineCounter }) {
  const [collapsed, setCollapsed] = useState(false);
  const currentLine = ++lineCounter.current;
  const serverKeys = Object.keys(servers);

  return (
    <div style={{
      borderLeft: annotation ? `2px solid ${annotation.borderColor}` : undefined,
      marginLeft: annotation ? -2 : undefined,
    }}>
      <div
        style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', minHeight: 20, cursor: 'pointer' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
          {currentLine}
        </span>
        <span style={{ color: '#6b7280', marginRight: 4, fontSize: 10, width: 12, textAlign: 'center' }}>
          {collapsed ? '▶' : '▼'}
        </span>
        <span style={{ color: SYNTAX.key }}>"mcpServers"</span>
        <span style={{ color: SYNTAX.colon }}>: </span>
        <span style={{ color: SYNTAX.brace }}>{'{'}</span>
        {collapsed && <span style={{ color: '#6b7280' }}> {serverKeys.length} servers </span>}
        {collapsed && <span style={{ color: SYNTAX.brace }}>{'}'}</span>}
        {annotation && (
          <span style={{
            marginLeft: 8, fontSize: 10, color: annotation.borderColor,
            background: `${annotation.borderColor}15`, padding: '1px 6px', borderRadius: 3,
          }}>
            {annotation.label}
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          {serverKeys.map((serverName) => {
            const server = servers[serverName];
            const transport = server.transport || 'stdio';
            return (
              <div key={serverName} style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  right: 8,
                  top: 2,
                  fontSize: 9,
                  color: COLORS.transport.text,
                  background: 'rgba(107,114,128,0.15)',
                  padding: '1px 5px',
                  borderRadius: 3,
                }}>
                  transport: {transport}
                </span>
                <JsonNode
                  keyName={serverName}
                  value={server}
                  depth={2}
                  annotations={{}}
                  lineCounter={lineCounter}
                />
              </div>
            );
          })}
          <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', minHeight: 20 }}>
            <span style={{ color: '#4a4a6a', marginRight: 8, minWidth: 28, display: 'inline-block', textAlign: 'right', fontSize: 11 }}>
              {++lineCounter.current}
            </span>
            <span style={{ color: SYNTAX.brace }}>{'}'}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// SCROLLBAR STYLES (injected once)
// ============================================================================

const SCROLLBAR_STYLE_ID = 'mcp-inspector-scrollbar';

if (typeof document !== 'undefined' && !document.getElementById(SCROLLBAR_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = SCROLLBAR_STYLE_ID;
  style.textContent = `
    .mcp-inspector-scroll::-webkit-scrollbar { width: 6px; }
    .mcp-inspector-scroll::-webkit-scrollbar-track { background: transparent; }
    .mcp-inspector-scroll::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
    .mcp-inspector-scroll::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }
  `;
  document.head.appendChild(style);
}
