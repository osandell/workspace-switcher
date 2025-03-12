const {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  screen,
} = require("electron");
const focusVSCodeWindow = require("./httpHandler.js");
const windowManager = require("./windowManager");
const http = require("http");
const Store = require("electron-store");
const store = new Store();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Process IDs for various applications
let kittyMainPID;
let kittyLfPID;
let codePID;

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

    // Find Kitty main process
    promises.push(
      new Promise((resolveKitty) => {
        exec(
          `wmctrl -lpx | awk '$4 == "kitty-main.kitty-main" {print $3}' | sort -u`,
          (error, stdout) => {
            if (error) {
              console.error(`Error finding Kitty main process: ${error}`);
            } else {
              kittyMainPID = stdout.trim();
              console.log(`Kitty Main PID: ${kittyMainPID}`);
            }
            resolveKitty();
          }
        );
      })
    );

    // Find Kitty LF process
    promises.push(
      new Promise((resolveKittyLF) => {
        exec(
          `wmctrl -lpx | awk '$4 == "kitty-lf.kitty-lf" {print $3}' | sort -u`,
          (error, stdout) => {
            if (error) {
              console.error(`Error finding Kitty LF process: ${error}`);
            } else {
              kittyLfPID = stdout.trim();
              console.log(`Kitty LF PID: ${kittyLfPID}`);
            }
            resolveKittyLF();
          }
        );
      })
    );

    // Find Cursor/VS Code process
    promises.push(
      new Promise((resolveCursor) => {
        exec("pgrep -f 'opt/cursor/cursor'", (error, stdout) => {
          if (error) {
            console.error(`Error finding Cursor process: ${error}`);
          } else {
            codePID = stdout.split("\n")[0];
            console.log(`Code PID: ${codePID}`);
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
function changeActiveTab(direction) {
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

  // Handle navigation based on focused app
  if (storedTabs[activeTabIndex].focusedApp === "kitty-main") {
    focusVSCodeWindow(codePID, pathShort)
      .then((response) => {
        console.log("Successfully focused VS Code window:", response);

        const kittyPlatformWindowId =
          storedTabs[activeTabIndex].kittyPlatformWindowId;

        if (kittyPlatformWindowId) {
          focusKittyWindow(kittyPlatformWindowId, pathShort);
        } else {
          console.log("No Kitty platform window ID found, creating new window");
          launchNewKittyWindow(pathShort);
          updateKittyPlatformWindowId(kittyWindowId);
        }

        // Line window visibility update commented out
        // if (storedTabs[activeTabIndex].terminalFullScreen ||
        //     storedTabs[activeTabIndex].editorFullscreen) {
        //   windowManager.setLineWindowVisible(false);
        // } else {
        //   windowManager.setLineWindowVisible(true);
        // }
      })
      .catch((error) => {
        console.error("Failed to focus VS Code window:", error);
      });
  } else {
    focusKittyWindow(
      storedTabs[activeTabIndex].kittyPlatformWindowId,
      pathShort
    );

    focusVSCodeWindow(codePID, pathShort)
      .then((response) => {
        console.log("Successfully focused VS Code window:", response);
      })
      .catch((error) => {
        console.error("Failed to focus VS Code window:", error);
      });
  }
}

/**
 * Focus Kitty terminal window
 * @param {string} platformWindowId - The Kitty platform window ID
 * @param {string} path - The working directory path
 */
function focusKittyWindow(platformWindowId, path) {
  // Get kitty window id from platform_window_id
  exec(
    `kitty @ --to unix:/tmp/kitty_main ls | jq '.[] | select(.platform_window_id == ${platformWindowId}) | .tabs[] | select(.is_active == true) | .windows[].id'`,
    (err, stdout) => {
      if (err) {
        console.error(`Error getting kitty window id: ${err}`);
        return;
      }

      const kittyWindowId = stdout.trim();
      if (kittyWindowId) {
        // Focus existing kitty window
        exec(
          `kitty @ --to unix:/tmp/kitty_main focus-window --match id:${kittyWindowId}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error focusing Kitty window: ${error}`);
              return;
            }
            if (stderr) {
              console.error(`Kitty stderr: ${stderr}`);
              return;
            }
            console.log(`Kitty window focused with path: ${path}`);
          }
        );
      } else {
        console.error("No Kitty window ID found");
      }
    }
  );
}

/**
 * Launch a new Kitty terminal window
 * @param {string} path - The working directory path
 */
function launchNewKittyWindow(path) {
  exec(
    `kitty @ --to unix:/tmp/kitty_main launch --type=os-window --cwd=${path}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening Kitty: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`Kitty stderr: ${stderr}`);
        return;
      }

      let kittyWindowId = stdout;
      updateKittyPlatformWindowId(kittyWindowId);

      // Position window
      windowManager.positionKittyWindow(
        kittyMainPID,
        storedTabs[activeTabIndex].terminalFullScreen
      );

      console.log(`Kitty opened with path: ${path}`);
    }
  );
}

/**
 * Update the Kitty platform window ID in the current tab
 * @param {string} kittyWindowId - The Kitty window ID
 */
function updateKittyPlatformWindowId(kittyWindowId) {
  exec(
    `kitty @ --to unix:/tmp/kitty_main ls | jq '.[] | select(.tabs[].windows[].id == ${kittyWindowId}) | .platform_window_id'`,
    (err, stdout) => {
      if (err) {
        console.error(`Error getting platform_window_id: ${err}`);
        return;
      }

      const kittyPlatformWindowId = stdout.trim();
      storedTabs[activeTabIndex].kittyPlatformWindowId = kittyPlatformWindowId;
      store.set("storedTabs", storedTabs);
    }
  );
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

    // Close VS Code window
    exec(
      `curl -f -X POST -H "Content-Type: application/json" -d '{"command": "focus",  "pid": ${codePID}, "title": ${pathShort}}' localhost:57320 && xdotool key ctrl+shift+super+w`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error closing VS Code: ${error}`);
        }

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
    );
  }
}

/**
 * Close a Kitty window
 * @param {string} platformWindowId - The Kitty platform window ID
 */
function closeKittyWindow(platformWindowId) {
  // List all windows within the specified platform window ID
  exec(
    `kitty @ --to unix:/tmp/kitty_main ls | jq '.[] | select(.platform_window_id == ${platformWindowId}) | .tabs[].windows[].id'`,
    (err, stdout) => {
      if (err) {
        console.error(
          `Error listing windows for platform_window_id ${platformWindowId}: ${err}`
        );
        return;
      }

      // Parse the output to get all window IDs within the platform window
      const windowIds = stdout
        .trim()
        .split("\n")
        .map((id) => id.trim())
        .filter((id) => id);

      // Close each window within the platform window
      windowIds.forEach((kittyWindowId) => {
        exec(
          `kitty @ --to unix:/tmp/kitty_main close-window --match id:${kittyWindowId}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(
                `Error closing Kitty window ID ${kittyWindowId}: ${error}`
              );
              return;
            }
            if (stderr) {
              console.error(
                `Kitty stderr for window ID ${kittyWindowId}: ${stderr}`
              );
              return;
            }
            console.log(`Kitty window closed with ID: ${kittyWindowId}`);
          }
        );
      });
    }
  );
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
      path: "~/dev/osandell",
      terminalFullScreen: false,
      editorFullScreen: false,
    });
    storedTabs.push({
      focusedApp: "kitty-main",
      fullscreenApps: [],
      gitkrakenVisible: false,
      gitkrakenInitialized: false,
      kittyPlatformWindowId: "",
      path: "~/Downloads",
      terminalFullScreen: false,
      editorFullScreen: false,
    });

    store.set("storedTabs", storedTabs); // Save the new tab
  }

  // Create main top bar window
  mainWindow = new BrowserWindow({
    width: displayType === "internal" ? width : width * 2,
    height: 23, // topBarHeight
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
  });

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

  // Open Kitty terminal
  exec(
    `kitty @ --to unix:/tmp/kitty_main launch --type=os-window --cwd=${dirPath}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening Kitty: ${error}`);
        return;
      }

      let kittyWindowId = stdout;
      updateKittyPlatformWindowId(kittyWindowId);

      setTimeout(() => {
        windowManager.positionKittyWindow(kittyMainPID);
      }, kittyDelay);
    }
  );

  // Open VS Code/Cursor
  exec(`cursor ${dirPath}`, (vscodeError, vscodeStdout, vscodeStderr) => {
    if (vscodeError) {
      console.error(`Error opening editor: ${vscodeError}`);
      return;
    }

    setTimeout(() => {
      windowManager.positionEditorWindow(codePID);
    }, kittyDelay + 1000);
  });
}

/**
 * Positions all windows according to the current display configuration
 */
function positionAllWindows() {
  const currentDisplay = windowManager.getCurrentDisplay();
  console.log(`Positioning all windows for ${currentDisplay} display`);

  // Position Cursor/VS Code window
  if (codePID) {
    windowManager.positionEditorWindow(codePID, false);
  } else {
    console.warn("Cannot position Cursor/Code - PID not found");
  }

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

        case "toggleFullScreen":
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

        case "external":
          console.log("Manually triggering external display configuration");
          windowManager.applyDisplayLayout(kittyMainPID, codePID);
          break;

        case "internal":
          console.log("Manually triggering internal display configuration");
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

  server.listen(57321);
}

/**
 * Handle GitKraken toggle
 */
function handleGitKraken() {
  storedTabs = store.get("storedTabs") || [];
  activeTabIndex = store.get("activeTabIndex", 0);
  const gitkrakenVisible = storedTabs[activeTabIndex]?.gitkrakenVisible;
  const focusedApp = storedTabs[activeTabIndex]?.focusedApp;

  if (gitkrakenVisible) {
    // Close GitKraken and focus back on editor
    exec(`cursor ${storedTabs[activeTabIndex].path}`, (vscodeError) => {
      if (vscodeError) {
        console.error(`Error opening editor: ${vscodeError}`);
      }
    });

    setTimeout(() => {
      if (focusedApp === "kitty-main") {
        exec(`wmctrl -xa kitty-main.kitty-main`, (error) => {
          if (error) {
            console.error(`Error focusing kitty: ${error}`);
          }
        });
      }
    }, 500);

    storedTabs[activeTabIndex].gitkrakenVisible = false;
  } else {
    // Open GitKraken if not initialized
    if (!storedTabs[activeTabIndex].gitkrakenInitialized) {
      const fullPath = storedTabs[activeTabIndex].path.replace(
        /^~/,
        "/home/olof/"
      );

      exec(`gitkraken -p "${fullPath}" `, () => {
        storedTabs[activeTabIndex].gitkrakenInitialized = true;
        store.set("storedTabs", storedTabs);

        // TODO: Add this back in when found a way to solve it better in kmonad.kbd, see note there.
        //setTimeout(() => {
        // focusKittyWindow(storedTabs[activeTabIndex].kittyPlatformWindowId, storedTabs[activeTabIndex].path);
        //}, 1000);
      });
    }

    storedTabs[activeTabIndex].gitkrakenVisible = true;
  }

  store.set("storedTabs", storedTabs);
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

  await removeStoredTabsPlatformIDs();

  // Create window and set up window management
  createWindow();
  setupDisplayListeners();
  setupHttpServer();

  // Position all windows on startup with a short delay to ensure everything is ready
  setTimeout(() => {
    console.log("Positioning all windows on startup");
    windowManager.detectAndSetCurrentDisplay();
    positionAllWindows();
  }, 2000);
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
