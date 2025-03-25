const { exec } = require("child_process");
const { screen } = require("electron");
const fs = require("fs").promises;

/**
 * Window manager module to handle positioning and resizing of application windows dynamically
 */

const topBarHeightPercentage = 0.02; // 2% of screen height
let hiddenEdgeSize = 0.01; // 1% of screen width and height
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
function getScreenDimensionsScaled() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;

  if (
    primaryDisplay.bounds.width === 2048 &&
    primaryDisplay.bounds.height === 1152
  ) {
    // This is most likely an Apple Studio Display which is seen as 2 half-size displays
    // We need to adjust the width and height accordingly

    hiddenEdgeSize = 0.0; // The Studio Display has no hidden area

    return {
      width: primaryDisplay.bounds.width * scaleFactor * 2,
      height: primaryDisplay.bounds.height * scaleFactor,
    };
  }

  hiddenEdgeSize = 0.01;

  return {
    width: primaryDisplay.bounds.width * scaleFactor,
    height: primaryDisplay.bounds.height * scaleFactor,
  };
}

/**
 * Get screen dimensions dynamically
 */
function getScreenDimensionsRaw() {
  const primaryDisplay = screen.getPrimaryDisplay();

  // Apple Studio Display
  if (
    primaryDisplay.bounds.width === 2048 &&
    primaryDisplay.bounds.height === 1152
  ) {
    hiddenEdgeSize = 0.0; // The Studio Display has no hidden area

    return {
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
    };
  }

  // ThinkVision
  if (
    primaryDisplay.bounds.width === 2560 &&
    primaryDisplay.bounds.height === 1440
  ) {
    hiddenEdgeSize = 0.0; // The ThinkVision has no hidden area

    return {
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
    };
  }

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
    requestQueue = requestQueue
      .then(() => {
        return new Promise((innerResolve) => {
          fn(() => {
            innerResolve();
            resolve();
          });
        });
      })
      .catch((err) => {
        console.error("Error in request queue:", err);
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
  currentDisplay =
    primaryDisplay.bounds.width === 1463 || primaryDisplay.bounds.width === 1707
      ? "internal"
      : "external";
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
    console.log(
      "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    hiddenEdgeSize    \x1b[8m\x1b[40m\x1b[0m%c windowManager.js 192 \n",
      "color: white; background: black; font-weight: bold",
      "",
      hiddenEdgeSize
    );

    const { width, height } = getScreenDimensionsRaw();
    const newBounds = {
      x: currentDisplay === "external" ? hiddenEdgeSize * width : 0,
      y: currentDisplay === "external" ? hiddenEdgeSize * height : 0,
      width:
        currentDisplay === "external"
          ? width - width * hiddenEdgeSize * 2
          : width,
      height: height * topBarHeightPercentage,
    };
    mainWindow.setBounds(newBounds);
  }
}

/**
 * Position a window dynamically based on screen size
 */
function positionWindow(pid, xPercent, yPercent, widthPercent, heightPercent) {
  const { height, width } = getScreenDimensionsScaled();

  const command = `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition", "pid": ${pid}, "x": ${Math.floor(
    width * xPercent
  )}, "y": ${Math.floor(height * yPercent)}, "width": ${Math.floor(
    width * widthPercent
  )}, "height": ${Math.floor(height * heightPercent)}}' localhost:57320`;

  return executeCurl(command);
}

/**
 * Position the Kitty terminal window dynamically
 */
function positionKittyWindow(pid, fullscreen = false) {
  let command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" position-wt.ahk "${pid}" "${fullscreen}" "${currentDisplay}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error positioning WT: ${error}`);
      return;
    }
  });
}

/**
 * Position the code editor window dynamically
 */
function positionEditorWindow(path, fullscreen = false) {
  console.log(
    "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    pathhhh    \x1b[8m\x1b[40m\x1b[0m%c windowManager.js 193 \n",
    "color: white; background: black; font-weight: bold",
    "",
    path
  );
  let command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" position-cursor.ahk "${path}" "${fullscreen}" "${currentDisplay}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error positioning WT: ${error}`);
      return;
    }
  });
}

/**
 * Apply the display layout configuration dynamically
 */
async function applyDisplayLayout(kittyMainPID, codePID) {
  detectAndSetCurrentDisplay();
  await positionKittyWindow(kittyMainPID, false);
  await positionEditorWindow(codePID, false);
  updateTopBarPositionAndSize();
  return Promise.resolve();
}

/**
 * Toggle fullscreen mode for the current application
 */
async function toggleFullscreen(currentTab, kittyMainPID, codePID) {
  console.log(
    "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    currentTab    \x1b[8m\x1b[40m\x1b[0m%c windowManager.js 264 \n",
    "color: white; background: black; font-weight: bold",
    "",
    currentTab
  );
  console.log("toggleFullscreen9");
  try {
    const activeWindow = (
      await fs.readFile(
        "C:\\Users\\Olof.Sandell\\AppData\\Local\\Temp\\active-window.log",
        "utf8"
      )
    ).trim();

    console.log("activeWindow", activeWindow);

    if (activeWindow === "Ubuntu") {
      currentTab.terminalFullScreen = !currentTab.terminalFullScreen;
      positionKittyWindow(kittyMainPID, currentTab.terminalFullScreen);
    } else if (activeWindow.includes("(Text Editor)")) {
      console.log("testy");
      currentTab.editorFullScreen = !currentTab.editorFullScreen;
      positionEditorWindow(codePID, currentTab.editorFullScreen);
    }
    return currentTab;
  } catch (err) {
    console.error("Error reading active window data:", err);
  }
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
