const { exec } = require('child_process');
const { screen } = require('electron');

/**
 * Window manager module to handle positioning and resizing of application windows
 */

// Window position configurations
const internalTopOffset = 47;
const externalTopOffset = 300;
const internalWindowHeight = 2085;  
const externalWindowHeight = 2340;
const topBarHeight = 23;

// Default window positions for different display configurations
const defaultPositions = {
  internal: {
    editor: { x: 1300, y: internalTopOffset + 2, width: 2112, height: internalWindowHeight - 2 },
    editorFullscreen: { x: 0, y: 155, width: 1920, height: internalWindowHeight },
    line: { x: 300, y: 155, width: 1, height: internalWindowHeight },
    terminal: { x: 0, y: internalTopOffset, width: 1300, height: internalWindowHeight },
    terminalFullscreen: { x: 0, y: internalTopOffset, width: 4000, height: internalWindowHeight },
  },
  external: {
    editor: { x: 2300, y: externalTopOffset, width: 2500, height: externalWindowHeight },
    editorFullscreen: { x: externalTopOffset, y: 50, width: 2305, height: externalWindowHeight },
    line: { x: 932, y: externalTopOffset, width: 1, height: externalWindowHeight },
    terminal: { x: 300, y: externalTopOffset, width: 2000, height: externalWindowHeight },
    terminalFullscreen: { x: externalTopOffset, y: 300, width: 4500, height: externalWindowHeight },
  },
};

// State
let currentDisplay = "internal";
let mainWindow = null;
let lineWindow = null;

/**
 * Detect and set the current display configuration
 * @returns {string} The current display type
 */
function detectAndSetCurrentDisplay() {
  const displays = screen.getAllDisplays();
  currentDisplay = displays.length > 1 ? "external" : "internal";
  console.log(`Current display set to: ${currentDisplay}`);
  return currentDisplay;
}

/**
 * Set the main window reference
 * @param {BrowserWindow} window - The main app window
 */
function setMainWindow(window) {
  mainWindow = window;
}

/**
 * Set the line window reference
 * @param {BrowserWindow} window - The line separator window
 */
function setLineWindow(window) {
  lineWindow = window;
}

/**
 * Update the top bar window position and size
 */
function updateTopBarPositionAndSize() {
  if (mainWindow) {
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    const newBounds = {
      x: 0,
      y: 0,
      width: width,
      height: topBarHeight,
    };
    mainWindow.setBounds(newBounds);
  }
}

/**
 * Update the line window position and size
 */
function updateLineWindowPositionAndSize() {
  if (lineWindow) {
    const newBounds = {
      width: 1,
      height: defaultPositions[currentDisplay].line.height,
      x: defaultPositions[currentDisplay].line.x,
      y: defaultPositions[currentDisplay].line.y,
    };
    lineWindow.setBounds(newBounds);
  }
}

/**
 * Set the line window visibility
 * @param {boolean} show - Whether to show or hide the line
 */
function setLineWindowVisible(show) {
  if (lineWindow) {
    if (show) {
      if (lineWindow.isVisible() === false) {
        lineWindow.show();
      }
    } else {
      if (lineWindow.isVisible() === true) {
        lineWindow.hide();
      }
    }
  }
}

/**
 * Position the Kitty terminal window
 * @param {string} pid - The process ID of Kitty
 * @param {string} display - The display configuration to use
 * @param {boolean} fullscreen - Whether to use fullscreen mode
 * @param {boolean} frontmostOnly - Whether to only move the frontmost window
 */
function positionKittyWindow(pid, display = currentDisplay, fullscreen = false, frontmostOnly = false) {
  const position = fullscreen ? 
    defaultPositions[display].terminalFullscreen : 
    defaultPositions[display].terminal;
    
  exec(
    `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition", "frontmostOnly": ${frontmostOnly}, "pid": ${pid}, "x": ${position.x}, "y": ${position.y}, "width": ${position.width}, "height": ${position.height}}' localhost:57320`,
    (err) => {
      if (err) {
        console.error(`Error moving Kitty window: ${err}`);
      }
    }
  );
}

/**
 * Position the code editor window
 * @param {string} pid - The process ID of the editor
 * @param {string} display - The display configuration to use
 * @param {boolean} fullscreen - Whether to use fullscreen mode
 * @param {boolean} frontmostOnly - Whether to only move the frontmost window
 */
function positionEditorWindow(pid, display = currentDisplay, fullscreen = false, frontmostOnly = false) {
  const position = fullscreen ? 
    defaultPositions[display].editorFullscreen : 
    defaultPositions[display].editor;
    
  exec(
    `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition", "frontmostOnly": ${frontmostOnly}, "pid": ${pid}, "x": ${position.x}, "y": ${position.y}, "width": ${position.width}, "height": ${position.height}}' localhost:57320`,
    (err) => {
      if (err) {
        console.error(`Error moving editor window: ${err}`);
      }
    }
  );
}

/**
 * Apply the external display layout configuration
 * @param {string} kittyMainPID - The process ID of the main Kitty instance
 * @param {string} kittyLfPID - The process ID of the Kitty LF instance
 * @param {string} codePID - The process ID of the code editor
 */
function applyExternalDisplayLayout(kittyMainPID, kittyLfPID, codePID) {
  currentDisplay = "external";
  
  // Position terminal window
  positionKittyWindow(kittyMainPID);
  
  // Position editor window
  positionEditorWindow(codePID);
  
  // Position LF window
  if (kittyLfPID) {
    exec(
      `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition", "pid": ${kittyLfPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminalFullscreen.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' localhost:57320`,
      (err) => {
        if (err) {
          console.error(`Error moving Kitty LF window: ${err}`);
        }
      }
    );
  }

  // Update UI elements
  updateTopBarPositionAndSize();
}

/**
 * Apply the internal display layout configuration
 * @param {string} kittyMainPID - The process ID of the main Kitty instance
 * @param {string} codePID - The process ID of the code editor
 */
function applyInternalDisplayLayout(kittyMainPID, codePID) {
  currentDisplay = "internal";
  
  // Position terminal window
  positionKittyWindow(kittyMainPID);
  
  // Position editor window
  positionEditorWindow(codePID);
  
  // Update UI elements
  updateTopBarPositionAndSize();
}

/**
 * Toggle fullscreen mode for the current application
 * @param {Object} currentTab - The current tab object
 * @param {string} kittyMainPID - The process ID of the main Kitty instance
 * @param {string} codePID - The process ID of the code editor
 */
function toggleFullscreen(currentTab, kittyMainPID, codePID) {
  if (currentTab.focusedApp === "kitty-main") {
    currentTab.terminalFullScreen = !currentTab.terminalFullScreen;
    setLineWindowVisible(!currentTab.terminalFullScreen);
    
    positionKittyWindow(
      kittyMainPID, 
      currentDisplay, 
      currentTab.terminalFullScreen, 
      true
    );
  } else if (currentTab.focusedApp === "vscode") {
    currentTab.editorFullScreen = !currentTab.editorFullScreen;
    setLineWindowVisible(!currentTab.editorFullScreen);
    
    positionEditorWindow(
      codePID, 
      currentDisplay, 
      currentTab.editorFullScreen, 
      true
    );
    
    // Ensure focus is on the editor
    exec(`cursor`, (error) => {
      if (error) {
        console.error(`Error opening editor: ${error}`);
      }
    });
  }
  
  return currentTab;
}

// Export the module
module.exports = {
  defaultPositions,
  detectAndSetCurrentDisplay,
  setMainWindow,
  setLineWindow,
  updateTopBarPositionAndSize,
  updateLineWindowPositionAndSize,
  setLineWindowVisible,
  positionKittyWindow,
  positionEditorWindow,
  applyExternalDisplayLayout,
  applyInternalDisplayLayout,
  toggleFullscreen,
  getCurrentDisplay: () => currentDisplay,
};
