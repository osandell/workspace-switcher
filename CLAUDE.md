# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron application called "workspace-switcher" that manages different development workspaces on macOS. It creates a top bar interface for switching between project workspaces and automatically manages window positioning for development tools (Cursor/VSCode, Kitty terminal instances, and GitKraken).

## Development Commands

```bash
# Start the application
npm start
# or
pnpm start

# Start using the provided script
./start_workspace_switcher.sh
```

## Architecture

### Core Components

- **main.js** (1381 lines) - Main Electron process handling:
  - Window management and positioning via HTTP API calls to localhost:57320
  - Multi-display support (internal/external monitor configurations)
  - Tab/workspace state management using electron-store
  - Application lifecycle and inter-process communication
  - HTTP server on port 57321 for external commands

- **renderer.js** - Frontend rendering process for the top bar UI:
  - Keyboard navigation (arrow keys for tab switching, 'r' for reload, 'd' for close)
  - Dynamic button creation for workspace tabs
  - Theme switching (light/dark mode with Gruvbox and Solarized color schemes)

- **index.html** - Simple UI container with button container div
- **styles.css** - Solarized color palette definitions and button styling

### Key Features

- **Workspace Management**: Each tab represents a project workspace with associated file path
- **Window Positioning**: Automatically positions and resizes Cursor, Kitty terminal windows, and a visual separator line
- **Multi-Monitor Support**: Different window layouts for internal vs external displays
- **State Persistence**: Uses electron-store to save workspace tabs and active tab index
- **External Tool Integration**: Integrates with Kitty terminal, Cursor editor, and GitKraken via command-line APIs

### Application Integration

The application expects specific applications to be installed:
- **Cursor** (code editor) at `/Applications/Cursor.app`
- **Kitty terminals**:
  - `kitty-main` at `/Applications/kitty-main.app`
  - `kitty-lf` at `/Applications/kitty-lf.app`
- **GitKraken** at `/Applications/GitKraken.app`

Window positioning is handled via HTTP API calls to localhost:57320 (external window management service).

### State Management

- Workspace tabs stored in electron-store with properties:
  - `path`: Project directory path
  - `focusedApp`: Currently focused application ("kitty-main" or "vscode")
  - `terminalFullScreen`/`editorFullScreen`: Fullscreen state flags
  - `kittyPlatformWindowId`: Kitty window identifier for management
  - `gitkrakenVisible`/`gitkrakenInitialized`: GitKraken state

### HTTP Command Interface

The application runs an HTTP server on port 57321 accepting commands:
- `left`/`right`: Switch tabs
- `close`: Close active tab
- `duplicate`: Duplicate current workspace
- `resetWindows`: Reset all window positions
- `toggleFullScreen`: Toggle fullscreen for active application
- `setKittyMainFocused`/`setVscodeFocused`: Set focus state
- Directory paths: Create new workspace for that path

## Shell Scripts

- **start_workspace_switcher.sh**: Starts the application from the correct directory
- **focus_workspace_app.sh**: Helper script for focusing specific applications based on state file