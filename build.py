#!/usr/bin/env python3
"""
Build script for MCP Glass Box Demo.
Combines all source components into a single self-contained index.html.
"""
import re
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(BASE, path), 'r') as f:
        return f.read()

def strip_module_syntax(code):
    """Remove ES module import/export statements."""
    # Remove import lines
    code = re.sub(r'^\s*import\s+.*?;\s*$', '', code, flags=re.MULTILINE)
    # Remove "export default " prefix
    code = re.sub(r'\bexport\s+default\s+', '', code)
    # Remove "export " prefix on declarations
    code = re.sub(r'\bexport\s+(?=const |let |var |function |class )', '', code)
    return code


# ============================================================================
# Read and process source files
# ============================================================================

sim_engine = strip_module_syntax(read('src/simulation-engine.jsx'))
arch_diagram = strip_module_syntax(read('src/architecture-diagram.jsx'))
msg_inspector = strip_module_syntax(read('src/message-inspector.jsx'))
chat_narrator = strip_module_syntax(read('src/chat-narrator.jsx'))
app_shell = read('src/app-shell.jsx')

# Remove duplicate "const C = COMPONENT_IDS;" from architecture diagram
# (already defined in the simulation engine section)
arch_diagram = re.sub(
    r'^\s*const\s+C\s*=\s*COMPONENT_IDS;\s*$',
    '// C = COMPONENT_IDS; (already defined in simulation engine)',
    arch_diagram,
    flags=re.MULTILINE
)

# Remove the scrollbar style injection from message-inspector
# (we define scrollbar styles globally in the HTML <style> block)
msg_inspector = re.sub(
    r"const SCROLLBAR_STYLE_ID\s*=.*?document\.head\.appendChild\(style\);\s*\}",
    '// Scrollbar styles are defined globally in the HTML <style> block',
    msg_inspector,
    flags=re.DOTALL
)


# ============================================================================
# HTML template parts
# ============================================================================

HTML_TOP = r'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Glass Box Demo</title>
  <!-- React 18 from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <!-- Babel standalone for JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #0f0f1a;
      color: #e2e8f0;
      overflow: hidden;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #root { height: 100vh; }

    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }

    /* Animations */
    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
// ============================================================================
// MCP Glass Box Demo — Single-File Application
// ============================================================================
// Built from source components. All code runs in-browser via Babel standalone.
// ============================================================================

const { useState, useCallback, useEffect, useRef, useMemo, createContext, useContext } = React;

'''

HTML_BOTTOM = r'''
// ============================================================================
// RENDER
// ============================================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
  </script>
</body>
</html>
'''


# ============================================================================
# Assemble the final HTML
# ============================================================================

sections = [
    HTML_TOP,
    '\n// ============================================================================\n',
    '// SECTION 1-5: SIMULATION ENGINE (Constants, Data, Steps, Hook)\n',
    '// ============================================================================\n\n',
    sim_engine,
    '\n\n// ============================================================================\n',
    '// SECTION 6: ARCHITECTURE DIAGRAM\n',
    '// ============================================================================\n\n',
    arch_diagram,
    '\n\n// ============================================================================\n',
    '// SECTION 7: MESSAGE INSPECTOR, LOG & CONFIG VIEWER\n',
    '// ============================================================================\n\n',
    msg_inspector,
    '\n\n// ============================================================================\n',
    '// SECTION 8: CHAT PANEL, STEP NARRATOR & ACT TRANSITIONS\n',
    '// ============================================================================\n\n',
    chat_narrator,
    '\n\n// ============================================================================\n',
    '// SECTION 9: APPLICATION SHELL (Context, Layout, Keyboard, Landing)\n',
    '// ============================================================================\n\n',
    app_shell,
    HTML_BOTTOM,
]

output = ''.join(sections)

output_path = os.path.join(BASE, 'index.html')
with open(output_path, 'w') as f:
    f.write(output)

lines = output.count('\n')
size_kb = len(output.encode('utf-8')) / 1024
print(f'Built index.html ({lines} lines, {size_kb:.0f} KB)')
