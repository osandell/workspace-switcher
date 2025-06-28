const {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  screen,
} = require("electron");
// const focusCursorWindow = require("./httpHandler.js");
const windowManager = require("./windowManager");
const http = require("http");
const Store = require("electron-store");
const store = new Store();
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");

// Process IDs for various applications
let kittyMainPID;
let kittyLfPID;
let codePID;

store.clear();

// Store for application state
let storedTabs = store.get("storedTabs", []);
let activeTabIndex = store.get("activeTabIndex", 0);

/**
 * Detect system dark/light theme preference
 * @returns {string} 'dark' or 'light'
 */
function detectSystemTheme() {
  return new Promise((resolve) => {
    // Get current username to ensure we read the correct user's settings
    exec("whoami", (whoamiError, whoamiStdout) => {
      const username = whoamiStdout.trim();
      console.log(`Current username: ${username}`);

      // Try using dconf with explicit user
      const dconfCommand =
        username === "root"
          ? `sudo -u ${
              process.env.SUDO_USER || "olof"
            } dconf read /org/gnome/desktop/interface/color-scheme`
          : "dconf read /org/gnome/desktop/interface/color-scheme";

      exec(dconfCommand, (error, stdout) => {
        if (error) {
          console.error(`Error detecting system theme with dconf: ${error}`);
        } else {
          const output = stdout.trim().replace(/'/g, "");
          console.log(`dconf color scheme: "${output}"`);

          if (output.includes("prefer-dark")) {
            console.log("Detected dark theme from dconf color-scheme");
            resolve("dark");
            return;
          }
          if (output.includes("prefer-light")) {
            console.log("Detected light theme from dconf color-scheme");
            resolve("light");
            return;
          }
        }

        // If the above fails, force dark theme for now since we know the user wants dark mode
        console.log("Could not reliably detect theme, defaulting to dark mode");
        resolve("dark");
      });
    });
  });
}

/**
 * Initialize process IDs by finding running applications
 * @returns {Promise} Promise that resolves when all PIDs are found
 */
function initializeProcessIDs() {
  return new Promise((resolve) => {
    const promises = [];

    // Find Kitty main process - using Windows command
    promises.push(
      new Promise((resolveKitty) => {
        exec(
          `tasklist /FI "IMAGENAME eq WindowsTerminal.exe" /FO CSV /NH`,
          (error, stdout) => {
            if (error) {
              console.error(`Error finding Windows Terminal process: ${error}`);
            } else {
              // Extract PID from CSV output
              const lines = stdout.trim().split('\n');
              if (lines.length > 0 && lines[0].includes('WindowsTerminal.exe')) {
                const parts = lines[0].split(',');
                if (parts.length > 1) {
                  kittyMainPID = parts[1].replace(/"/g, '');
                  console.log(`Windows Terminal PID: ${kittyMainPID}`);
                }
              }
            }
            resolveKitty();
          }
        );
      })
    );

    // Find Kitty LF process - using Windows command
    promises.push(
      new Promise((resolveKittyLF) => {
        exec(
          `tasklist /FI "IMAGENAME eq WindowsTerminal.exe" /FO CSV /NH`,
          (error, stdout) => {
            if (error) {
              console.error(`Error finding Windows Terminal LF process: ${error}`);
            } else {
              // Extract PID from CSV output
              const lines = stdout.trim().split('\n');
              if (lines.length > 1 && lines[1].includes('WindowsTerminal.exe')) {
                const parts = lines[1].split(',');
                if (parts.length > 1) {
                  kittyLfPID = parts[1].replace(/"/g, '');
                  console.log(`Windows Terminal LF PID: ${kittyLfPID}`);
                }
              }
            }
            resolveKittyLF();
          }
        );
      })
    );

    // Find Cursor/VS Code process - using Windows command
    promises.push(
      new Promise((resolveCursor) => {
        exec(`tasklist /FI "IMAGENAME eq Cursor.exe" /FO CSV /NH`, (error, stdout) => {
          if (error) {
            console.error(`Error finding Cursor process: ${error}`);
          } else {
            // Extract PID from CSV output
            const lines = stdout.trim().split('\n');
            if (lines.length > 0 && lines[0].includes('Cursor.exe')) {
              const parts = lines[0].split(',');
              if (parts.length > 1) {
                codePID = parts[1].replace(/"/g, '');
                console.log(`Cursor PID: ${codePID}`);
              }
            }
          }
          resolveCursor();
        });
      })
    );

    // Wait for all process ID lookups to complete
    Promise.all(promises).then(() => {
      console.log("All process IDs initialized");
      resolve();
    });
  });
}

/**
 * Set up display change listeners
 */
function setupDisplayListeners() {
  powerMonitor.on("resume", () => {
    console.log("System is waking up from sleep");

    const displays = screen.getAllDisplays();
    if (displays.length > 1) {
      windowManager.applyDisplayLayout(kittyMainPID, kittyLfPID, codePID);
    }
  });

  screen.on("display-added", () => {
    console.log("Display added");
    windowManager.applyDisplayLayout(kittyMainPID, kittyLfPID, codePID);
  });

  screen.on("display-removed", () => {
    console.log("Display removed");
    windowManager.applyDisplayLayout(kittyMainPID, codePID);
  });
}

/**
 * Handle changing the active tab
 * @param {string} direction - Direction to change tab (ArrowLeft or ArrowRight)
 */
async function changeActiveTab(direction) {
  // Reset previous tab state
  if (storedTabs[activeTabIndex]) {
    storedTabs[activeTabIndex].gitkrakenInitialized = false;
    store.set("storedTabs", storedTabs);
  }

  // Update active tab index
  if (direction === "ArrowRight") {
    activeTabIndex = (activeTabIndex + 1) % storedTabs.length;
  } else if (direction === "ArrowLeft") {
    activeTabIndex =
      (activeTabIndex - 1 + storedTabs.length) % storedTabs.length;
  }

  if (direction) {
    store.set("activeTabIndex", activeTabIndex);
    const theme = store.get("theme", "light");
    mainWindow.webContents.send("update-active-tab", theme, activeTabIndex);
  }

  // Format path for display (replace home directory with ~)
  const homeDir = process.env.HOME;

  let pathShort;
  if (storedTabs[activeTabIndex].path.startsWith(homeDir + "/")) {
    pathShort = storedTabs[activeTabIndex].path.replace(homeDir, "~");
  } else {
    pathShort = storedTabs[activeTabIndex].path;
  }

  try {
    const activeProcess = (await fsPromises.readFile(
      "C:\\Users\\Olof.Sandell\\AppData\\Local\\Temp\\active-process.log",
      "utf8"
    )).trim();

    console.log("activeProcess", activeProcess);

    if (activeProcess === "WindowsTerminal.exe") {
        focusCursorWindow(
          storedTabs[activeTabIndex].cursorPlatformWindowId,
          pathShort
        ).then((response) => {
          focusKittyWindow(
            storedTabs[activeTabIndex].kittyPlatformWindowId,
            pathShort
          );
        });
    } else if (activeProcess === "Cursor.exe") {
      focusKittyWindow(
        storedTabs[activeTabIndex].kittyPlatformWindowId,
        pathShort
      ).then((response) => {
        focusCursorWindow(
          storedTabs[activeTabIndex].cursorPlatformWindowId,
          pathShort
        );
      });
    }
  } catch (err) {
    console.error("Error reading active window data:", err);
  }
}

/**
 * Focus Kitty terminal window
 * @param {string} platformWindowId - The Kitty platform window ID
 * @param {string} path - The working directory path
 */
function focusKittyWindow(platformWindowId, path) {
  return new Promise((resolve, reject) => {
    const { exec } = require("child_process");

    // Escape quotes in path to prevent command injection
    const escapedPath = path.replace(/"/g, '\\"');

    // Construct the command to execute AutoHotkey with the test.ahk script
    const command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" focus-wt.ahk ${
      platformWindowId || 0
    } "${escapedPath}"`;

    console.log("Executing command:", command); // Debug log

    exec(command, (error, stdout, stderr) => {
      console.log(
        "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    hmm    \x1b[8m\x1b[40m\x1b[0m%c main.js 300 \n",
        "color: white; background: black; font-weight: bold",
        ""
      );
      if (error) {
        console.error("Error executing AutoHotkey:", error);
        reject(error);
        return;
      }

      if (stderr) {
        console.error("AutoHotkey stderr:", stderr);
      }

      if (stdout) {
        // if stdout is a number, update the kittyPlatformWindowId
        if (!isNaN(stdout)) {
          console.log("AutoHotkey stdout:", stdout);
          updateKittyPlatformWindowId(stdout);
          setTimeout(() => {
            windowManager.positionKittyWindow(stdout, false);
          }, 500);
        }
      }

      console.log("AutoHotkey script executed successfully");
      resolve({
        statusCode: 200,
        data: stdout,
      });
    });
  });

  // Get kitty window id from platform_window_id
  // exec(
  //   `kitty @ --to unix:/tmp/kitty_main ls | jq '.[] | select(.platform_window_id == ${platformWindowId}) | .tabs[] | select(.is_active == true) | .windows[].id'`,
  //   (err, stdout) => {
  //     if (err) {
  //       console.error(`Error getting kitty window id: ${err}`);
  //       return;
  //     }

  //     const kittyWindowId = stdout.trim();
  //     if (kittyWindowId) {
  //       // Focus existing kitty window
  //       exec(
  //         `kitty @ --to unix:/tmp/kitty_main focus-window --match id:${kittyWindowId}`,
  //         (error, stdout, stderr) => {
  //           if (error) {
  //             console.error(`Error focusing Kitty window: ${error}`);
  //             return;
  //           }
  //           if (stderr) {
  //             console.error(`Kitty stderr: ${stderr}`);
  //             return;
  //           }
  //           console.log(`Kitty window focused with path: ${path}`);
  //         }
  //       );
  //     } else {
  //       console.error("No Kitty window ID found");
  //     }
  //   }
  // );
}

function focusCursorWindow(codePID, pathShort) {
  console.log(
    "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    pathShort    \x1b[8m\x1b[40m\x1b[0m%c httpHandler.js 10 \n",
    "color: white; background: black; font-weight: bold",
    "",
    pathShort
  );

  return new Promise((resolve, reject) => {
    const { exec } = require("child_process");

    // Escape quotes in pathShort to prevent command injection
    const escapedPath = pathShort.replace(/"/g, '\\"');

    // Construct the command to execute AutoHotkey with the test.ahk script
    const command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" focus-cursor.ahk ${
      codePID || 0
    } "${escapedPath}"`;

    console.log("Executing command:", command); // Debug log

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing AutoHotkey:", error);
        reject(error);
        return;
      }

      if (stderr) {
        console.error("AutoHotkey stderr:", stderr);
      }

      if (stdout) {
        // if stdout is a number, update the kittyPlatformWindowId
        if (!isNaN(stdout)) {
          console.log("AutoHotkey stdout:", stdout);
          updateCursorPlatformWindowId(stdout);
          setTimeout(() => {
            windowManager.positionEditorWindow(stdout, false);
          }, 500);
        }
      }

      console.log("AutoHotkey script executed successfully");
      resolve({
        statusCode: 200,
        data: stdout,
      });
    });
  });
}

/**
 * Launch a new Kitty terminal window
 * @param {string} path - The working directory path
 */
function launchNewKittyWindow(path) {
  const { exec } = require("child_process");

  // Escape quotes in path to prevent command injection
  const escapedPath = path.replace(/"/g, '\\"');

  // Construct the command to execute AutoHotkey with the test.ahk script
  const command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" focus-wt.ahk 132 "${escapedPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("Error executing AutoHotkey:", error);
      reject(error);
      return;
    }

    if (stderr) {
      console.error("AutoHotkey stderr:", stderr);
    }

    if (stdout) {
      console.log("AutoHotkey stdout:", stdout);
      updateKittyPlatformWindowId(stdout);
    }

    setTimeout(() => {
      windowManager.positionKittyWindow(stdout, false);
    }, 500);

    console.log("AutoHotkey script executed successfully");
  });

  // exec(
  //   `kitty @ --to unix:/tmp/kitty_main launch --type=os-window --cwd=${path}`,
  //   (error, stdout, stderr) => {
  //     if (error) {
  //       console.error(`Error opening Kitty: ${error}`);
  //       return;
  //     }
  //     if (stderr) {
  //       console.error(`Kitty stderr: ${stderr}`);
  //       return;
  //     }

  //     let kittyWindowId = stdout;
  //     updateKittyPlatformWindowId(kittyWindowId);

  //     // Position window
  //     windowManager.positionKittyWindow(
  //       kittyMainPID,
  //       storedTabs[activeTabIndex].terminalFullScreen
  //     );

  //     console.log(`Kitty opened with path: ${path}`);
  //   }
  // );
}

/**
 * Update the Kitty platform window ID in the current tab
 * @param {string} kittyWindowId - The Kitty window ID
 */
function updateKittyPlatformWindowId(kittyWindowId) {
  // exec(
  //   `kitty @ --to unix:/tmp/kitty_main ls | jq '.[] | select(.tabs[].windows[].id == ${kittyWindowId}) | .platform_window_id'`,
  //   (err, stdout) => {
  //     if (err) {
  //       console.error(`Error getting platform_window_id: ${err}`);
  //       return;
  //     }

  //     const kittyPlatformWindowId = stdout.trim();
  // storedTabs[activeTabIndex].kittyPlatformWindowId = kittyPlatformWindowId;
  storedTabs[activeTabIndex].kittyPlatformWindowId = kittyWindowId;
  store.set("storedTabs", storedTabs);
  // }
  // );
}

function updateCursorPlatformWindowId(cursorWindowId) {
  storedTabs[activeTabIndex].cursorPlatformWindowId = cursorWindowId;
  store.set("storedTabs", storedTabs);
}

/**
 * Close the active tab
 */
function closeActiveTab() {
  if (storedTabs.length > 0) {
    // Format path for display
    const homeDir = process.env.HOME;
    let pathShort;
    if (storedTabs[activeTabIndex].path.startsWith(homeDir + "/")) {
      pathShort = storedTabs[activeTabIndex].path.replace(homeDir, "~");
    } else {
      pathShort = storedTabs[activeTabIndex].path;
    }

    // Close Cursor window
    closeCursorWindow(storedTabs[activeTabIndex].cursorPlatformWindowId);

    // Close Kitty window
    closeKittyWindow(storedTabs[activeTabIndex].kittyPlatformWindowId);

    // Remove the tab
    storedTabs.splice(activeTabIndex, 1);

    // Adjust activeTabIndex if necessary
    if (activeTabIndex >= storedTabs.length) {
      activeTabIndex = Math.max(storedTabs.length - 1, 0);
    }

    // Update UI
    const theme = store.get("theme", "light");
    store.set("storedTabs", storedTabs);
    store.set("activeTabIndex", activeTabIndex);
    mainWindow.webContents.send(
      "update-tabs",
      storedTabs,
      activeTabIndex,
      theme
    );

    // Focus new active tab
    changeActiveTab();
  }
}

/**
 * Close a Kitty window
 * @param {string} platformWindowId - The Kitty platform window ID
 */
function closeKittyWindow(platformWindowId) {
  // Close WT terminal
  const command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" close-wt.ahk ${platformWindowId}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error closing WT: ${error}`);
      return;
    }
  });
}

/**
 * Close a Cursor window
 * @param {string} platformWindowId - The Cursor platform window ID
 */
function closeCursorWindow(platformWindowId) {
  // Close Cursor
  const command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" close-cursor.ahk ${platformWindowId}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error closing Cursor: ${error}`);
      return;
    }
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  const displayType = windowManager.detectAndSetCurrentDisplay();
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  // Check if there are no stored tabs
  if (storedTabs.length === 0) {
    // Create a new tab in the home directory
    storedTabs.push({
      focusedApp: "kitty-main",
      fullscreenApps: [],
      gitkrakenVisible: false,
      gitkrakenInitialized: false,
      kittyPlatformWindowId: "",
      path: "/home/olof/dev/osandell",
      terminalFullScreen: false,
      editorFullScreen: false,
    });
    storedTabs.push({
      focusedApp: "kitty-main",
      fullscreenApps: [],
      gitkrakenVisible: false,
      gitkrakenInitialized: false,
      kittyPlatformWindowId: "",
      path: "C:\\Users\\Olof.Sandell\\Downloads",
      terminalFullScreen: false,
      editorFullScreen: false,
    });
    storedTabs.push({
      focusedApp: "kitty-main",
      fullscreenApps: [],
      gitkrakenVisible: false,
      gitkrakenInitialized: false,
      kittyPlatformWindowId: "",
      path: "/home/olof/AiQu",
      terminalFullScreen: false,
      editorFullScreen: false,
    });

    store.set("storedTabs", storedTabs); // Save the new tab
  }

  // Create main top bar window
  mainWindow = new BrowserWindow({
    width: displayType === "internal" ? width : width * 2,
    height: 30,
    x: 0,
    y: 0,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: false,
    roundedCorners: false,
    hasShadow: false,
    thickFrame: false,
    transparent: true,
    resizable: false,
    useContentSize: true,
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Register the main window with the window manager
  windowManager.setMainWindow(mainWindow);

  // Load the UI
  mainWindow.loadFile("index.html");

  // Set up event handlers
  setupMainWindowEvents();

  // Line window creation commented out for now
  // createLineWindow();
}

/**
 * Create the line separator window
 */
function createLineWindow() {
  // Line window functionality commented out for now
  /*
  const currentDisplay = windowManager.getCurrentDisplay();
  const linePosition = windowManager.defaultPositions[currentDisplay].line;
  
  lineWindow = new BrowserWindow({
    width: 1, // 1px wide
    height: linePosition.height,
    x: linePosition.x,
    y: linePosition.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    roundedCorners: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Register the line window with the window manager
  windowManager.setLineWindow(lineWindow);

  // Load line window content
  lineWindow.loadURL(
    "data:text/html;charset=utf-8,<style>body { margin: 0; padding: 0; background: rgb(212, 203, 183); }</style><body></body>"
  );

  // Ignore mouse events for the line window
  lineWindow.setIgnoreMouseEvents(true);
  */
}

/**
 * Set up event handlers for the main window
 */
function setupMainWindowEvents() {
  // Send stored paths to the renderer process after window is loaded
  mainWindow.webContents.on("did-finish-load", () => {
    activeTabIndex = store.get("activeTabIndex", 0);
    const theme = store.get("theme", "light");
    mainWindow.webContents.send(
      "initialize-buttons",
      storedTabs,
      activeTabIndex
    );
    mainWindow.webContents.send("change-theme", theme, activeTabIndex);
  });

  // Set up IPC handlers
  ipcMain.on("reload-window", () => {
    mainWindow.reload();
  });

  ipcMain.on("change-active-tab", (event, direction) => {
    changeActiveTab(direction);
  });

  ipcMain.on("new-tab", () => {
    activeTabIndex = storedTabs.length - 1;
    const theme = store.get("theme", "light");
    store.set("activeTabIndex", activeTabIndex);
    mainWindow.webContents.send("update-active-tab", theme, activeTabIndex);
  });

  ipcMain.on("close-active-tab", () => {
    closeActiveTab();
  });
}

/**
 * Toggle fullscreen mode for the current application
 */
async function toggleFullscreen() {
  console.log("toggleFullscreen8");
  activeTabIndex = store.get("activeTabIndex", 0);
  const currentTab = storedTabs[activeTabIndex];

  const updatedTab = await windowManager.toggleFullscreen(
    currentTab,
    kittyMainPID,
    codePID
  );

  storedTabs[activeTabIndex] = updatedTab;
  store.set("storedTabs", storedTabs);
}

/**
 * Create a new workspace with the specified path
 * @param {string} path - The workspace path
 */
function createNewWorkspace(dirPath) {
  console.log(
    "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    dirPath    \x1b[8m\x1b[40m\x1b[0m%c main.js 547 \n",
    "color: white; background: black; font-weight: bold",
    "",
    dirPath
  );
  const isGitRepo = fs.existsSync(path.join(dirPath, ".git"));
  const kittyDelay = 500;

  // Add new tab
  storedTabs.push({
    focusedApp: "kitty-main",
    fullscreenApps: [],
    gitkrakenVisible: false,
    gitkrakenInitialized: false,
    kittyPlatformWindowId: "",
    path: dirPath,
    terminalFullScreen: false,
    editorFullScreen: false,
  });

  store.set("storedTabs", storedTabs);
  mainWindow.webContents.send("add-new-button", dirPath);

  // Escape quotes in path to prevent command injection
  const escapedPath = dirPath.replace(/"/g, '\\"');

  // Construct the command to execute AutoHotkey with the focus-wt.ahk script
  let command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" focus-wt.ahk 123 "${escapedPath}"`;

  console.log("Executing WT command:", command); // Debug log

  // Open Windows Terminal
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error opening WT: ${error}`);
      return;
    }

    if (stderr) {
      console.error(`WT stderr: ${stderr}`);
    }

    console.log(`WT stdout: ${stdout}`);

    let wtWindowId = stdout.trim(); // Make sure to trim any whitespace
    updateKittyPlatformWindowId(wtWindowId);

    // This setTimeout should now execute
    setTimeout(() => {
      console.log(`Positioning WT window with ID: ${wtWindowId}`);
      windowManager.positionKittyWindow(wtWindowId, false);
    }, kittyDelay);
  });

  focusCursorWindow(0, dirPath);
}

/**
 * Positions all windows according to the current display configuration
 */
function positionAllWindows() {
  const currentDisplay = windowManager.getCurrentDisplay();
  console.log(`Positioning all windows for ${currentDisplay} display`);

  // Position Cursor/VS Code windows
  storedTabs.forEach((tab) => {
    windowManager.positionEditorWindow(tab.cursorPlatformWindowId, false);
  });

  // Position WT windows
  storedTabs.forEach((tab) => {
    windowManager.positionKittyWindow(tab.kittyPlatformWindowId, false);
  });

  // Update top bar position
  windowManager.updateTopBarPositionAndSize();
}

/**
 * Set up HTTP server for external commands
 */
function setupHttpServer() {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      if (!mainWindow) {
        res.end("Main window not available");
        return;
      }

      const gitkrakenVisible = false;
      const focusedApp = storedTabs[activeTabIndex]?.focusedApp;

      // Handle various commands
      switch (body) {
        case "left":
          changeActiveTab("ArrowLeft");
          // Line window visibility toggle commented out
          // storedTabs[activeTabIndex].terminalFullScreen
          //   ? windowManager.setLineWindowVisible(false)
          //   : windowManager.setLineWindowVisible(true);
          break;

        case "right":
          changeActiveTab("ArrowRight");
          // Line window visibility toggle commented out
          // storedTabs[activeTabIndex].terminalFullScreen
          //   ? windowManager.setLineWindowVisible(false)
          //   : windowManager.setLineWindowVisible(true);
          break;

        case "close":
          closeActiveTab();
          break;

        case "duplicate":
          activeTabIndex = store.get("activeTabIndex", 0);
          const activeTabPath = storedTabs[activeTabIndex].path;
          mainWindow.webContents.send("add-new-button", activeTabPath);
          storedTabs.push({ path: activeTabPath });
          store.set("storedTabs", storedTabs);
          break;

        case "resetWindows":
          // Reposition all windows based on current display setting
          positionAllWindows();
          break;

        case "toggleFullscreen":
          console.log("toggleFullscreen");
          toggleFullscreen();
          break;

        case "toCompactScreen":
          // Reset from fullscreen to compact mode
          activeTabIndex = store.get("activeTabIndex", 0);
          const currentTab = storedTabs[activeTabIndex];

          if (currentTab.focusedApp === "kitty-main") {
            currentTab.terminalFullScreen = false;
          } else if (currentTab.focusedApp === "vscode") {
            currentTab.editorFullScreen = false;
          }

          // Line window visibility update commented out
          // windowManager.setLineWindowVisible(true);

          if (currentTab.focusedApp === "kitty-main") {
            windowManager.positionKittyWindow(kittyMainPID, false);
          } else {
            windowManager.positionEditorWindow(codePID, false);
            exec(`cursor`, (vscodeError) => {
              if (vscodeError) {
                console.error(`Error opening editor: ${vscodeError}`);
              }
            });
          }

          store.set("storedTabs", storedTabs);
          break;

        case "toggleGitKraken":
          handleGitKraken();
          break;

        case "clearStore":
          store.clear();
          break;

        case "printStore":
          console.log(store.get("storedTabs"));
          break;

        case "activateDarkMode":
          store.set("theme", "dark");
          activeTabIndex = store.get("activeTabIndex", 0);
          mainWindow.webContents.send("change-theme", "dark", activeTabIndex);
          break;

        case "activateLightMode":
          store.set("theme", "light");
          activeTabIndex = store.get("activeTabIndex", 0);
          mainWindow.webContents.send("change-theme", "light", activeTabIndex);
          break;

        case "setKittyMainFocused":
          if (storedTabs[activeTabIndex]) {
            storedTabs[activeTabIndex].focusedApp = "kitty-main";
          }
          // Line window visibility toggle commented out
          // storedTabs[activeTabIndex].terminalFullScreen
          //   ? windowManager.setLineWindowVisible(false)
          //   : windowManager.setLineWindowVisible(true);
          break;

        case "setVscodeFocused":
          if (storedTabs[activeTabIndex]) {
            storedTabs[activeTabIndex].focusedApp = "vscode";
          }
          // Line window visibility update commented out
          // windowManager.setLineWindowVisible(true);
          break;

        case "winPos":
          windowManager.detectAndSetCurrentDisplay();
          break;

        case "reposition":
          windowManager.applyDisplayLayout(kittyMainPID, codePID);
          break;

        case "setDefocused":
          // Line window visibility update commented out
          // windowManager.setLineWindowVisible(false);
          break;

        default:
          // Assume this is a path for a new workspace
          if (body && body.length > 0) {
            createNewWorkspace(body);
          }
          break;
      }

      res.end("Request processed");
    });
  });

  server.listen(9123);
}

/**
 * Handle GitKraken toggle
 */
async function handleGitKraken() {
  storedTabs = store.get("storedTabs") || [];
  activeTabIndex = store.get("activeTabIndex", 0);
  const gitkrakenVisible = storedTabs[activeTabIndex]?.gitkrakenVisible;
  const focusedApp = storedTabs[activeTabIndex]?.focusedApp;

  const activeWindow = (
    await fsPromises.readFile(
      "C:\\Users\\Olof.Sandell\\AppData\\Local\\Temp\\active-window.log"
    )
  )
    .toString()
    .trim();

  console.log("activeWindow", activeWindow);

  if (activeWindow === "GitKraken Desktop (Ubuntu)") {
    console.log("GitKraken is active");
  } else {
    console.log(
      "GitKraken is not active",
      storedTabs[activeTabIndex].gitkrakenInitialized
    );

    let path = storedTabs[activeTabIndex].path;
    if (path.startsWith("/home/olof/AiQu")) {
      path = `\\\\wsl.localhost\\AiQu\\home\\olof\\AiQu`;
    } else {
      path = path.replace("~", `\\\\wsl.localhost\\Ubuntu\\home`);
      path = path.replace(
        "/home/olof",
        `\\\\wsl.localhost\\Ubuntu\\home\\olof`
      );
      path = path.replace("/mnt/c", `C:\\`);
    }

    // Open GitKraken if not initialized
    if (!storedTabs[activeTabIndex].gitkrakenInitialized) {
      const command = `"C:\\Users\\Olof.Sandell\\AppData\\Local\\Fork\\current\\Fork.exe" "${path}"`;
      console.log("Executing command:", command);
      exec(command, (error) => {
        if (error) {
          console.error(`Error opening GitKraken: ${error}`);
        }

        storedTabs[activeTabIndex].gitkrakenInitialized = true;
        store.set("storedTabs", storedTabs);
      });
    }
  }
}

function removeStoredTabsPlatformIDs() {
  storedTabs.forEach((tab) => {
    tab.kittyPlatformWindowId = "";
  });
  store.set("storedTabs", storedTabs);
}

// Application startup
app.whenReady().then(async () => {
  // Detect system theme before initializing UI
  const systemTheme = await detectSystemTheme();
  console.log(`Setting application theme to: ${systemTheme}`);
  store.set("theme", systemTheme);

  // Initialize process IDs first
  await initializeProcessIDs();
  console.log(
    "Process IDs initialized, updating platform window IDs for stored tabs"
  );

  removeStoredTabsPlatformIDs();

  // Create window and set up window management
  createWindow();
  setupDisplayListeners();
  setupHttpServer();

  changeActiveTab(null);

  // Position all windows on startup with a short delay to ensure everything is ready
  // setTimeout(() => {
  //   console.log("Positioning all windows on startup");
  //   windowManager.detectAndSetCurrentDisplay();
  //   positionAllWindows();
  // }, 2000);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
