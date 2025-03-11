const { exec } = require('child_process');
const { screen } = require('electron');

/**
 * Window manager module to handle positioning and resizing of application windows dynamically
 */

const topBarHeightPercentage = 0.023; // 2% of screen height
const hiddenEdgeSize = 0.01; // 1% of screen width and height
const padding = 0.05; // 1% of screen width and height
// State
let currentDisplay = "internal";
let mainWindow = null;
let lineWindow = null;

// Request queue for window positioning
let requestQueue = Promise.resolve();

/**
 * Get screen dimensions dynamically
 */
function getScreenDimensions() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  
  return {
    width: primaryDisplay.bounds.width * scaleFactor,
    height: primaryDisplay.bounds.height * scaleFactor,
  };
}

/**
 * Get screen dimensions dynamically
 */
function getScreenDimensionsScaled() {
  const primaryDisplay = screen.getPrimaryDisplay();
  
  return {
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
  };
}

/**
 * Add a request to the queue
 * @param {Function} fn - The function to execute
 * @returns {Promise} A promise that resolves when the function is executed
 */
function enqueueRequest(fn) {
  return new Promise((resolve) => {
    requestQueue = requestQueue.then(() => {
      return new Promise((innerResolve) => {
        fn(() => {
          innerResolve();
          resolve();
        });
      });
    }).catch(err => {
      console.error('Error in request queue:', err);
      resolve(); // Continue queue even if there's an error
    });
  });
}

/**
 * Execute curl command and wait for completion
 * @param {string} command - The curl command to execute
 * @returns {Promise} A promise that resolves when the command completes
 */
function executeCurl(command) {
  return enqueueRequest((done) => {
    exec(command, (err) => {
      if (err) {
        console.error(`Error executing curl command: ${err}`);
      }
      // Wait a small amount of time to ensure window manager has time to process
      setTimeout(done, 100);
    });
  });
}

/**
 * Detect and set the current display configuration
 * @returns {string} The current display type
 */
function detectAndSetCurrentDisplay() {
  const primaryDisplay = screen.getPrimaryDisplay();
  currentDisplay = primaryDisplay.bounds.width  === 1704 ? "internal" : "external";
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
 * Update the top bar window position and size dynamically
 */
function updateTopBarPositionAndSize() {
  if (mainWindow) {
    const { width, height } = getScreenDimensionsScaled();
    const newBounds = {
      x: currentDisplay === "external" ? hiddenEdgeSize * width : 0,
      y: currentDisplay === "external" ? hiddenEdgeSize * height : 0,
      width: currentDisplay === "external" ? width - (width * hiddenEdgeSize * 2) : width,
      height: height * topBarHeightPercentage,
    };
    mainWindow.setBounds(newBounds);
  }
}

/**
 * Position a window dynamically based on screen size
 */
function positionWindow(pid, xPercent, yPercent, widthPercent, heightPercent) {
  const { width, height } = getScreenDimensions();
  console.log("\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    height    \x1b[8m\x1b[40m\x1b[0m%c windowManager.js 115 \n", 'color: white; background: black; font-weight: bold', '', height);
  console.log("\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    width    \x1b[8m\x1b[40m\x1b[0m%c windowManager.js 115 \n", 'color: white; background: black; font-weight: bold', '', width);
  const command = `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition", "pid": ${pid}, "x": ${Math.floor(width * xPercent)}, "y": ${Math.floor(height * yPercent)}, "width": ${Math.floor(width * widthPercent)}, "height": ${Math.floor(height * heightPercent)}}' localhost:57320`;
  return executeCurl(command);
}

/**
 * Position the Kitty terminal window dynamically
 */
function positionKittyWindow(pid, fullscreen = false) {
  if (fullscreen) {
    return positionWindow(pid, 0, 0, 1, 1);
  }

  if (currentDisplay === "internal") {
    return positionWindow(pid, 0.0, topBarHeightPercentage, 0.4, 1-topBarHeightPercentage );
  } else {
    return positionWindow(pid, 0.0 + hiddenEdgeSize + padding, topBarHeightPercentage + hiddenEdgeSize + padding, 0.4 - hiddenEdgeSize - padding, 1-topBarHeightPercentage - (hiddenEdgeSize * 2 + padding * 2));
  }
}

/**
 * Position the code editor window dynamically
 */
function positionEditorWindow(pid, fullscreen = false) {
  if (fullscreen) {
    return positionWindow(pid, 0, 0, 1, 1);
  }
  if (currentDisplay === "internal") {
    return positionWindow(pid, 0.4, topBarHeightPercentage, 0.6, 1 - topBarHeightPercentage );
  } else {
    return positionWindow(pid, 0.4, topBarHeightPercentage + hiddenEdgeSize + padding, 0.6 - hiddenEdgeSize - padding, 1 - topBarHeightPercentage - (hiddenEdgeSize * 2 + padding * 2));
  }
}

/**
 * Apply the display layout configuration dynamically
 */
async function applyDisplayLayout(kittyMainPID, codePID) {
  detectAndSetCurrentDisplay();
  await positionKittyWindow(kittyMainPID);
  await positionEditorWindow(codePID);
  updateTopBarPositionAndSize();
  return Promise.resolve();
}

/**
 * Toggle fullscreen mode for the current application
 */
async function toggleFullscreen(currentTab, kittyMainPID, codePID) {
  if (currentTab.focusedApp === "kitty-main") {
    currentTab.terminalFullScreen = !currentTab.terminalFullScreen;
    await positionKittyWindow(kittyMainPID, currentTab.terminalFullScreen);
  } else if (currentTab.focusedApp === "vscode") {
    currentTab.editorFullScreen = !currentTab.editorFullScreen;
    await positionEditorWindow(codePID, currentTab.editorFullScreen);
  }
  return currentTab;
}

// Export the module
module.exports = {
  detectAndSetCurrentDisplay,
  setMainWindow,
  setLineWindow,
  updateTopBarPositionAndSize,
  positionKittyWindow,
  positionEditorWindow,
  applyDisplayLayout,
  toggleFullscreen,
  getCurrentDisplay: () => currentDisplay,
};
