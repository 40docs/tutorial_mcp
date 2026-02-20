// ============================================================================
// APPLICATION CONTEXT
// ============================================================================

const SimulationContext = createContext(null);

function useSimulationContext() {
  return useContext(SimulationContext);
}

// ============================================================================
// LANDING SCREEN
// ============================================================================

function LandingScreen({ onStart, onSkipToAct }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f1a',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Background dots */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.04 }}>
        <svg width="100%" height="100%">
          {Array.from({ length: 40 }, (_, i) =>
            Array.from({ length: 25 }, (_, j) => (
              <circle key={`${i}-${j}`} cx={i * 48 + 24} cy={j * 48 + 24} r="1.5" fill="#fff" />
            ))
          )}
        </svg>
      </div>

      <div style={{
        maxWidth: 580,
        width: '90%',
        textAlign: 'center',
        position: 'relative',
        animation: 'fadeIn 0.6s ease-out',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          top: -120,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 44,
          fontWeight: 800,
          color: '#f1f5f9',
          margin: '0 0 8px',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        }}>
          MCP Glass Box Demo
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 18,
          color: '#94a3b8',
          margin: '0 0 16px',
          fontStyle: 'italic',
        }}>
          An interactive simulation of the Model Context Protocol
        </p>

        {/* Description */}
        <p style={{
          fontSize: 15,
          color: '#64748b',
          lineHeight: 1.65,
          margin: '0 auto 40px',
          maxWidth: 480,
        }}>
          Watch every layer of MCP come alive — from boot sequence to tool execution.
          See JSON-RPC messages flow between components, API calls being constructed,
          and tool results injected back into conversations.
        </p>

        {/* Start button */}
        <button
          onClick={() => onStart()}
          style={{
            padding: '16px 56px',
            borderRadius: 14,
            border: '1px solid rgba(245,158,11,0.4)',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))',
            color: '#fbbf24',
            fontSize: 20,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: '0 0 40px rgba(245,158,11,0.12)',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.15))';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(245,158,11,0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(245,158,11,0.12)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Start Demo
        </button>

        {/* Skip to Act links */}
        <div style={{
          marginTop: 28,
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#4b5563', fontSize: 13, alignSelf: 'center' }}>Skip to:</span>
          {[
            { act: 1, label: 'Boot Sequence' },
            { act: 2, label: 'Simple Question' },
            { act: 3, label: 'Tool Call' },
            { act: 4, label: 'Chained Calls' },
          ].map(item => (
            <button
              key={item.act}
              onClick={() => onSkipToAct(item.act)}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: '1px solid #2a2a3c',
                background: 'transparent',
                color: '#6b7280',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e2e8f0';
                e.currentTarget.style.borderColor = '#4a4a5c';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.borderColor = '#2a2a3c';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Act {item.act}: {item.label}
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        <p style={{
          marginTop: 32,
          fontSize: 12,
          color: '#374151',
        }}>
          Keyboard: Arrow keys to navigate, 1-4 for acts, P to play/pause, Esc to reset
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER BAR
// ============================================================================

function HeaderBar({ currentAct, onGoToAct, currentStepIndex, totalSteps }) {
  const progressPct = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        background: '#11111b',
        borderBottom: '1px solid #2a2a3c',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            MCP Glass Box Demo
          </span>
        </div>

        {/* Act buttons + step counter */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[1, 2, 3, 4].map(act => (
            <button
              key={act}
              onClick={() => onGoToAct(act)}
              style={{
                padding: '4px 14px',
                borderRadius: 6,
                border: currentAct === act ? '1px solid #fbbf24' : '1px solid transparent',
                background: currentAct === act ? 'rgba(251,191,36,0.12)' : 'transparent',
                color: currentAct === act ? '#fbbf24' : '#6b7280',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {act}
            </button>
          ))}
          <span style={{
            color: '#4b5563',
            fontSize: 11,
            marginLeft: 8,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}>
            {currentStepIndex + 1}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#1a1a2e' }}>
        <div style={{
          height: '100%',
          width: progressPct + '%',
          background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  const [started, setStarted] = useState(false);
  const [showActTransition, setShowActTransition] = useState(null);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [selectedLogEntry, setSelectedLogEntry] = useState(null);
  const [isWide, setIsWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const prevActRef = useRef(null);

  const sim = useSimulation();

  // Responsive resize handler
  useEffect(() => {
    const handler = () => setIsWide(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Detect act changes for transition overlays
  useEffect(() => {
    if (started && prevActRef.current !== null && prevActRef.current !== sim.currentAct) {
      setShowActTransition(sim.currentAct);
    }
    prevActRef.current = sim.currentAct;
  }, [sim.currentAct, started]);

  // Reset selected log entry on step change
  useEffect(() => {
    setSelectedLogEntry(null);
  }, [sim.currentStepIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!started) return;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          sim.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          sim.prev();
          break;
        case '1': case '2': case '3': case '4':
          e.preventDefault();
          sim.goToAct(parseInt(e.key));
          break;
        case 'p': case 'P':
          e.preventDefault();
          sim.togglePlay();
          break;
        case 'Escape':
          e.preventDefault();
          sim.reset();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, sim.next, sim.prev, sim.goToAct, sim.togglePlay, sim.reset]);

  // Compute inspector payload
  const inspectorPayload = useMemo(() => {
    if (selectedLogEntry) return selectedLogEntry.payload;
    return sim.currentStep.message || null;
  }, [selectedLogEntry, sim.currentStep]);

  // Compute previous API request for diff view
  const previousApiRequest = useMemo(() => {
    if (!inspectorPayload || !inspectorPayload.messages) return null;
    const targetStepId = selectedLogEntry ? selectedLogEntry.stepId : sim.currentStep.id;
    const idx = sim.messageLog.findIndex(m => m.stepId === targetStepId);
    for (let i = (idx >= 0 ? idx : sim.messageLog.length) - 1; i >= 0; i--) {
      const entry = sim.messageLog[i];
      if (entry.payload && entry.payload.messages && entry.stepId !== targetStepId) {
        return entry.payload;
      }
    }
    return null;
  }, [inspectorPayload, sim.messageLog, selectedLogEntry, sim.currentStep]);

  const isWaitingForApi = sim.state.hostState === 'waiting_for_api';

  // Start handlers
  const handleStart = useCallback(() => {
    setStarted(true);
    sim.goToStep(0);
    setShowActTransition(1);
    prevActRef.current = 1;
  }, [sim]);

  const handleSkipToAct = useCallback((act) => {
    setStarted(true);
    sim.goToAct(act);
    prevActRef.current = act;
  }, [sim]);

  // Landing screen
  if (!started) {
    return <LandingScreen onStart={handleStart} onSkipToAct={handleSkipToAct} />;
  }

  // Main demo layout
  return (
    <SimulationContext.Provider value={sim}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0f0f1a',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        {/* Header */}
        <HeaderBar
          currentAct={sim.currentAct}
          onGoToAct={sim.goToAct}
          currentStepIndex={sim.currentStepIndex}
          totalSteps={sim.totalSteps}
        />

        {/* Main content area */}
        {isWide ? (
          /* === WIDE LAYOUT (>= 1024px) === */
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Left: Chat Panel */}
            <div style={{
              width: '38%',
              padding: '8px 4px 8px 8px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}>
              <ChatPanel
                conversationHistory={sim.conversationHistory}
                currentStep={sim.currentStep}
                isWaitingForApi={isWaitingForApi}
              />
            </div>

            {/* Right: Internals */}
            <div style={{
              width: '62%',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 8px 8px 4px',
              gap: 6,
              minHeight: 0,
            }}>
              {/* Architecture Diagram ~45% */}
              <div style={{
                flex: '4.5 1 0%',
                minHeight: 0,
                overflow: 'hidden',
                borderRadius: 12,
              }}>
                <ArchitectureDiagram
                  activeComponents={sim.activeComponents}
                  messageFlow={sim.messageFlow}
                  componentStates={sim.componentStates}
                  phase={sim.currentStep.phase}
                />
              </div>

              {/* Message Log + Inspector ~30% */}
              <div style={{
                flex: '3 1 0%',
                display: 'flex',
                gap: 6,
                minHeight: 0,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '40%',
                  minHeight: 0,
                  overflow: 'auto',
                  borderRadius: 6,
                }}>
                  <MessageLog
                    messageLog={sim.messageLog}
                    currentStepIndex={sim.currentStepIndex}
                    onSelectMessage={(entry) => setSelectedLogEntry(entry)}
                  />
                </div>
                <div style={{
                  width: '60%',
                  minHeight: 0,
                  overflow: 'auto',
                  borderRadius: 6,
                }}>
                  <PayloadInspector
                    message={inspectorPayload}
                    previousApiRequest={previousApiRequest}
                  />
                </div>
              </div>

              {/* Step Narrator ~25% */}
              <div style={{
                flex: '2.5 1 0%',
                minHeight: 0,
                overflow: 'auto',
                borderRadius: 12,
              }}>
                <StepNarrator
                  currentStep={sim.currentStep}
                  stepIndex={sim.currentStepIndex}
                  totalSteps={sim.totalSteps}
                  currentAct={sim.currentAct}
                  onNext={sim.next}
                  onPrev={sim.prev}
                  onPlay={sim.play}
                  onPause={sim.pause}
                  isPlaying={sim.isPlaying}
                  playSpeed={sim.playSpeed}
                  onSetSpeed={sim.setPlaySpeed}
                  onGoToAct={sim.goToAct}
                />
              </div>
            </div>
          </div>
        ) : (
          /* === NARROW LAYOUT (< 1024px) === */
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ minHeight: 280 }}>
              <ChatPanel
                conversationHistory={sim.conversationHistory}
                currentStep={sim.currentStep}
                isWaitingForApi={isWaitingForApi}
              />
            </div>
            <ArchitectureDiagram
              activeComponents={sim.activeComponents}
              messageFlow={sim.messageFlow}
              componentStates={sim.componentStates}
              phase={sim.currentStep.phase}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <MessageLog
                  messageLog={sim.messageLog}
                  currentStepIndex={sim.currentStepIndex}
                  onSelectMessage={(entry) => setSelectedLogEntry(entry)}
                />
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <PayloadInspector
                  message={inspectorPayload}
                  previousApiRequest={previousApiRequest}
                />
              </div>
            </div>
            <StepNarrator
              currentStep={sim.currentStep}
              stepIndex={sim.currentStepIndex}
              totalSteps={sim.totalSteps}
              currentAct={sim.currentAct}
              onNext={sim.next}
              onPrev={sim.prev}
              onPlay={sim.play}
              onPause={sim.pause}
              isPlaying={sim.isPlaying}
              playSpeed={sim.playSpeed}
              onSetSpeed={sim.setPlaySpeed}
              onGoToAct={sim.goToAct}
            />
          </div>
        )}

        {/* Config Viewer (collapsible bottom drawer) */}
        <div style={{ flexShrink: 0, padding: '0 8px 8px' }}>
          <ConfigViewer
            config={sim.config}
            isExpanded={configExpanded}
            onToggle={() => setConfigExpanded(prev => !prev)}
          />
        </div>

        {/* Act Transition Overlay */}
        {showActTransition && (
          <ActTransition
            act={showActTransition}
            onDismiss={() => setShowActTransition(null)}
          />
        )}
      </div>
    </SimulationContext.Provider>
  );
}
