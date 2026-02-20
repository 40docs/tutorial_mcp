// ============================================================================
// MCP Glass Box Demo — Chat Interface, Step Narrator & Act Transitions
// ============================================================================
// Components: ChatPanel, StepNarrator, ActTransition
// Consumes state from the useSimulation hook in simulation-engine.jsx
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { COLORS, ACT_METADATA } from './simulation-engine.jsx';

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

const PHASE_COLORS = {
  boot:              { bg: COLORS.host.bg,      text: COLORS.host.text,      label: 'BOOT SEQUENCE' },
  message:           { bg: '#4a3728',            text: '#fbbf24',             label: 'USER MESSAGE' },
  api_call:          { bg: COLORS.api.bg,        text: COLORS.api.text,       label: 'API CALL' },
  api_response:      { bg: COLORS.api.bg,        text: COLORS.api.text,       label: 'API RESPONSE' },
  tool_routing:      { bg: COLORS.client.bg,     text: COLORS.client.text,    label: 'TOOL ROUTING' },
  jsonrpc_request:   { bg: COLORS.client.bg,     text: COLORS.client.text,    label: 'JSON-RPC REQUEST' },
  server_exec:       { bg: COLORS.server.bg,     text: COLORS.server.text,    label: 'SERVER EXECUTION' },
  jsonrpc_response:  { bg: COLORS.server.bg,     text: COLORS.server.text,    label: 'JSON-RPC RESPONSE' },
  result_injection:  { bg: '#4a3728',            text: '#fbbf24',             label: 'RESULT INJECTION' },
  render:            { bg: '#374151',            text: '#9ca3af',             label: 'RENDER' },
};

const FONT = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
};

// ============================================================================
// 1. ChatPanel
// ============================================================================

export function ChatPanel({ conversationHistory, currentStep, isWaitingForApi }) {
  const scrollRef = useRef(null);
  const [expandedTools, setExpandedTools] = useState({});

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const toggleToolExpand = (id) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasMessages = conversationHistory && conversationHistory.length > 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#11111b',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: FONT.sans,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #2a2a3c',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: hasMessages ? '#10b981' : '#6b7280',
          boxShadow: hasMessages ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
        }} />
        <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
          Chat
        </span>
        {currentStep && currentStep.act > 1 && (
          <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 'auto' }}>
            Act {currentStep.act}
          </span>
        )}
      </div>

      {/* Message area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {!hasMessages && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
          }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>💬</span>
            <span style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
              Start a conversation to begin...
            </span>
          </div>
        )}

        {hasMessages && conversationHistory.map((msg, i) => (
          <ChatMessage
            key={msg.stepId + '-' + i}
            message={msg}
            expanded={expandedTools[msg.toolUseId]}
            onToggleTool={() => msg.toolUseId && toggleToolExpand(msg.toolUseId)}
          />
        ))}

        {/* Typing indicator */}
        {isWaitingForApi && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #c084fc, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>
              ✦
            </div>
            <div style={{
              background: '#1e1e2e',
              borderRadius: '12px 12px 12px 4px',
              padding: '12px 16px',
              display: 'flex',
              gap: 4,
              alignItems: 'center',
            }}>
              <TypingDot delay={0} />
              <TypingDot delay={150} />
              <TypingDot delay={300} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Chat sub-components ---

function TypingDot({ delay }) {
  return (
    <span style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#a855f7',
      display: 'inline-block',
      animation: `typingBounce 1.2s ease-in-out ${delay}ms infinite`,
    }}>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

function ChatMessage({ message, expanded, onToggleTool }) {
  const isUser = message.role === 'user';
  const isToolUse = message.type === 'tool_use';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        maxWidth: '88%',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}>
        {/* Avatar */}
        {!isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #c084fc, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0, color: '#fff',
          }}>
            ✦
          </div>
        )}

        {/* Bubble */}
        <div style={{
          background: isUser ? '#2d2b55' : '#1e1e2e',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          padding: isToolUse ? '0' : '10px 14px',
          border: isToolUse ? '1px solid #4a3728' : '1px solid transparent',
          overflow: 'hidden',
        }}>
          {isToolUse ? (
            <ToolCallBubble
              tool={message.tool}
              args={message.args}
              expanded={expanded}
              onToggle={onToggleTool}
            />
          ) : (
            <div style={{
              color: '#e2e8f0',
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {message.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolCallBubble({ tool, args, expanded, onToggle }) {
  const argsStr = args
    ? Object.entries(args).map(([k, v]) => {
        const val = typeof v === 'string'
          ? (v.length > 40 ? v.slice(0, 37) + '...' : v)
          : JSON.stringify(v);
        return `${k}: ${val}`;
      }).join(', ')
    : '';

  return (
    <div>
      {/* Collapsed pill */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          width: '100%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: FONT.sans,
        }}
      >
        <span style={{ fontSize: 14 }}>🔧</span>
        <span style={{
          color: '#fbbf24',
          fontSize: 13,
          fontWeight: 600,
        }}>
          Used tool: {tool}
        </span>
        <span style={{
          color: '#6b7280',
          fontSize: 12,
          fontFamily: FONT.mono,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          ({argsStr})
        </span>
        <span style={{
          color: '#6b7280',
          fontSize: 10,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
      </button>

      {/* Expanded args */}
      {expanded && args && (
        <div style={{
          padding: '0 12px 10px 12px',
          borderTop: '1px solid #2a2a3c',
        }}>
          <pre style={{
            margin: '8px 0 0 0',
            padding: 8,
            background: '#13131d',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: FONT.mono,
            color: '#c084fc',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// 2. StepNarrator
// ============================================================================

export function StepNarrator({
  currentStep,
  stepIndex,
  totalSteps,
  currentAct,
  onNext,
  onPrev,
  onPlay,
  onPause,
  isPlaying,
  playSpeed,
  onSetSpeed,
  onGoToAct,
}) {
  const phase = currentStep ? currentStep.phase : 'boot';
  const phaseInfo = PHASE_COLORS[phase] || PHASE_COLORS.boot;
  const narration = currentStep ? currentStep.narration : '';
  const stepLabel = currentStep ? currentStep.label : '';

  // Compute act-local step index
  const actMeta = ACT_METADATA[currentAct];

  // Speed presets in ms
  const speedPresets = [
    { label: '0.5x', value: 4000 },
    { label: '1x',   value: 2000 },
    { label: '2x',   value: 1000 },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      background: '#11111b',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: FONT.sans,
    }}>
      {/* Act Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #2a2a3c',
      }}>
        {[1, 2, 3, 4].map(act => {
          const meta = ACT_METADATA[act];
          const isActive = currentAct === act;
          return (
            <button
              key={act}
              onClick={() => onGoToAct(act)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                borderBottom: isActive ? '2px solid #fbbf24' : '2px solid transparent',
                background: isActive ? 'rgba(251,191,36,0.08)' : 'transparent',
                color: isActive ? '#fbbf24' : '#6b7280',
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                fontFamily: FONT.sans,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={meta ? meta.title : ''}
            >
              Act {act}{meta ? ': ' + meta.subtitle : ''}
            </button>
          );
        })}
      </div>

      {/* Step Header: Phase badge + step counter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        gap: 12,
      }}>
        {/* Phase badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: 999,
          background: phaseInfo.bg,
          color: phaseInfo.text,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          border: `1px solid ${phaseInfo.text}33`,
          whiteSpace: 'nowrap',
        }}>
          {phaseInfo.label}
        </span>

        {/* Step label */}
        <span style={{
          color: '#e2e8f0',
          fontSize: 13,
          fontWeight: 600,
          flex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {stepLabel}
        </span>

        {/* Step counter */}
        <span style={{
          color: '#6b7280',
          fontSize: 12,
          fontFamily: FONT.mono,
          whiteSpace: 'nowrap',
        }}>
          Step {stepIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Narration text */}
      <div style={{
        padding: '4px 20px 16px 20px',
        minHeight: 80,
      }}>
        <p style={{
          color: '#e2e8f0',
          fontSize: 16,
          lineHeight: 1.65,
          margin: 0,
          fontWeight: 400,
        }}>
          {highlightNarration(narration)}
        </p>
      </div>

      {/* Controls bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderTop: '1px solid #2a2a3c',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <NavButton onClick={onPrev} disabled={stepIndex <= 0} title="Previous step (←)">
            ◀ Back
          </NavButton>
          <NavButton onClick={onNext} disabled={stepIndex >= totalSteps - 1} title="Next step (→)">
            Next ▶
          </NavButton>
          <NavButton
            onClick={isPlaying ? onPause : onPlay}
            highlight={isPlaying}
            title={isPlaying ? 'Pause (P)' : 'Play (P)'}
          >
            {isPlaying ? '⏸ Pause' : '▶▶ Play'}
          </NavButton>
        </div>

        {/* Speed control */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: 11, marginRight: 4 }}>Speed:</span>
          {speedPresets.map(sp => (
            <button
              key={sp.label}
              onClick={() => onSetSpeed(sp.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: playSpeed === sp.value
                  ? '1px solid #fbbf24'
                  : '1px solid #2a2a3c',
                background: playSpeed === sp.value
                  ? 'rgba(251,191,36,0.12)'
                  : 'transparent',
                color: playSpeed === sp.value ? '#fbbf24' : '#6b7280',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT.mono,
                transition: 'all 0.15s ease',
              }}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Narrator sub-components ---

function NavButton({ children, onClick, disabled, highlight, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: highlight
          ? '1px solid #fbbf24'
          : '1px solid #2a2a3c',
        background: highlight
          ? 'rgba(251,191,36,0.15)'
          : disabled
            ? 'transparent'
            : 'rgba(255,255,255,0.03)',
        color: highlight
          ? '#fbbf24'
          : disabled
            ? '#3a3a4c'
            : '#e2e8f0',
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT.sans,
        minWidth: 44,
        minHeight: 40,
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

/**
 * Highlight key phrases in narration text.
 * Wraps text in single quotes and UPPERCASE phrases in styled spans.
 */
function highlightNarration(text) {
  if (!text) return null;

  // Split on quoted segments and specific emphasis words
  const parts = [];
  let remaining = text;
  // Match: 'quoted text', ALLCAPS words (3+ chars), bold markers **text**
  const pattern = /('([^']+)'|(?<!\w)(HOST|NOT|ALWAYS|SECOND|ANOTHER|TWO|THREE|SAME|DIFFERENT|NO|NEVER|NEW|ALL|WHO|WHAT)(?!\w)|\*\*([^*]+)\*\*)/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(remaining)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Quoted text → monospace amber
      parts.push(
        <span key={match.index} style={{
          color: '#fbbf24',
          fontFamily: FONT.mono,
          fontSize: '0.92em',
          background: 'rgba(251,191,36,0.08)',
          padding: '1px 4px',
          borderRadius: 3,
        }}>
          {match[2]}
        </span>
      );
    } else if (match[3]) {
      // UPPERCASE emphasis → bold amber
      parts.push(
        <span key={match.index} style={{
          color: '#fbbf24',
          fontWeight: 700,
        }}>
          {match[3]}
        </span>
      );
    } else if (match[4]) {
      // **bold** text
      parts.push(
        <strong key={match.index} style={{ color: '#fbbf24' }}>
          {match[4]}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}


// ============================================================================
// 3. ActTransition
// ============================================================================

export function ActTransition({ act, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const meta = ACT_METADATA[act];

  useEffect(() => {
    // Fade in
    const fadeInTimer = setTimeout(() => setVisible(true), 30);

    // Auto-dismiss after 3 seconds
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 3000);

    return () => {
      clearTimeout(fadeInTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [act]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 300);
  };

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    handleDismiss();
  };

  if (!meta) return null;

  // Act-specific accent colors
  const actColors = {
    1: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    2: { accent: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
    3: { accent: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    4: { accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  };
  const colors = actColors[act] || actColors[1];

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        opacity: visible && !exiting ? 1 : 0,
        transition: 'opacity 0.3s ease',
        cursor: 'pointer',
        fontFamily: FONT.sans,
      }}
    >
      <div style={{
        maxWidth: 520,
        width: '90%',
        background: '#1a1a2e',
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '36px 40px',
        textAlign: 'center',
        transform: visible && !exiting ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
        transition: 'transform 0.3s ease',
      }}>
        {/* Act number */}
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: colors.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 6,
        }}>
          Act {meta.number}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#f1f5f9',
          margin: '0 0 4px 0',
          lineHeight: 1.2,
        }}>
          {meta.title}
        </h2>

        {/* Subtitle */}
        <div style={{
          fontSize: 15,
          color: '#94a3b8',
          marginBottom: 20,
          fontStyle: 'italic',
        }}>
          {meta.subtitle}
        </div>

        {/* Description */}
        <p style={{
          fontSize: 15,
          color: '#cbd5e1',
          lineHeight: 1.6,
          margin: '0 0 20px 0',
        }}>
          {meta.description}
        </p>

        {/* Watch for */}
        <div style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '12px 16px',
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}>
            What to watch for
          </div>
          <p style={{
            fontSize: 14,
            color: '#e2e8f0',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {meta.watchFor}
          </p>
        </div>

        {/* Skip hint */}
        <div style={{
          marginTop: 20,
          fontSize: 12,
          color: '#4b5563',
        }}>
          Click anywhere or wait to continue
        </div>
      </div>
    </div>
  );
}
