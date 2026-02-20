# MCP Glass Box Demo

An interactive browser-based simulation that visualizes the **Model Context Protocol (MCP)** architecture in real time. Step through every JSON-RPC message, API call, and state change as an MCP host boots, connects to servers, and orchestrates tool calls.

## Quick Start

Open `index.html` in any modern browser. That's it — no install, no build step, no server required.

> The file loads React, Babel, and Tailwind from CDN, so you need an internet connection on first load.

For local development with live reload, serve the directory:

```bash
python3 -m http.server 5000
# Open http://localhost:5000
```

## What You'll See

The demo walks through **4 acts**:

| Act | Title | What Happens |
|-----|-------|-------------|
| 1 | Boot Sequence | Host reads config, spawns MCP clients, connects to servers via stdio, runs initialize handshakes, discovers tools |
| 2 | Simple Question | User asks a question the model answers without tools — a clean baseline |
| 3 | Tool-Triggered Question | A question that triggers `read_file` — the full MCP round-trip through client, server, and back |
| 4 | Chained Tool Calls | Two tools, two different servers, three API calls — the host orchestration loop in full view |

Each step shows:
- **Architecture Diagram** — animated SVG with highlighted components and message flow packets
- **Chat Panel** — Claude-style conversation UI with typing indicators
- **Message Log** — every JSON-RPC and API message in sequence
- **Payload Inspector** — full JSON payloads with syntax highlighting and diff view
- **Step Narrator** — explanation of what's happening and why

## Controls

| Input | Action |
|-------|--------|
| **Next / Back** buttons | Step forward or backward |
| **Play** button | Auto-advance through steps |
| Arrow keys | Navigate steps |
| `1` `2` `3` `4` | Jump to act |
| `P` | Toggle play/pause |
| `Esc` | Reset to beginning |

## Project Structure

```
index.html              # Self-contained demo (open directly in browser)
build.py                # Assembles index.html from source components
src/
  simulation-engine.jsx # State machine, step sequences, all MCP/API data
  architecture-diagram.jsx # SVG animated diagram component
  message-inspector.jsx # JSON inspector, message log, config viewer
  chat-narrator.jsx     # Chat panel, step narrator, act transitions
  app-shell.jsx         # App layout, context, keyboard shortcuts, landing page
```

## Rebuilding from Source

The source components in `src/` are assembled into a single `index.html` by the build script:

```bash
python3 build.py
```

This strips ES module syntax, deduplicates shared constants, and wraps everything in an HTML template with CDN dependencies.

## Tech Stack

- **React 18** — UI rendering (CDN)
- **Babel Standalone** — in-browser JSX transpilation (CDN)
- **Tailwind CSS** — utility styles (CDN)
- **Zero dependencies** — no npm, no node_modules, no bundler

## License

MIT
