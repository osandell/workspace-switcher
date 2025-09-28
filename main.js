const {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  screen,
} = require("electron");
const http = require("http");
const Store = require("electron-store");
const store = new Store();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
let currentDisplay = "internal";
const defaultPositions = {
  internal: {
    editor: { x: 600, y: 55, width: 1128, height: 1065 },
    terminal: { x: 0, y: 55, width: 600, height: 1065 },
  },
  external: {
    editor: { x: 932, y: 50, width: 1500, height: 1340 },
    terminal: { x: 127, y: 50, width: 805, height: 1340 },
  },
};
const topBarHeight = 23;

let mainWindow; // Main top bar window

let alacrittyMainPID;
exec("ps aux | grep alacritty", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }

  // Split the output into lines
  const lines = stdout.split("\n");

  // Filter out the grep command itself from the results
  const processLines = lines.filter((line) => !line.includes("grep"));

  // Assuming the first result is the one we want if multiple are returned
  if (processLines.length > 0) {
    const processInfo = processLines[0];

    // Extracting PID from the process info, assuming standard ps aux output format
    alacrittyMainPID = processInfo.split(/\s+/)[1]; // PID is in the second column

    // You can now use this PID for whatever you need
  } else {
    console.log("Alacritty process not found.");
  }
});

// let kittyLazygitPID;
// exec(
//   "ps aux | grep /Applications/kitty-lazygit.app/Contents/MacOS/kitty",
//   (error, stdout, stderr) => {
//     if (error) {
//       console.error(`Error: ${error}`);
//       return;
//     }
//     if (stderr) {
//       console.error(`stderr: ${stderr}`);
//       return;
//     }

//     // Split the output into lines
//     const lines = stdout.split("\n");

//     // Filter out the grep command itself from the results
//     const processLines = lines.filter((line) => !line.includes("grep"));

//     // Assuming the first result is the one we want if multiple are returned
//     if (processLines.length > 0) {
//       const processInfo = processLines[0];

//       // Extracting PID from the process info, assuming standard ps aux output format
//       kittyLazygitPID = processInfo.split(/\s+/)[1]; // PID is in the second column

//       // You can now use this PID for whatever you need
//     } else {
//       console.log("Kitty process not found.");
//     }
//   }
// );

let alacrittyLfPID;
exec("ps aux | grep alacritty | grep lf", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }

  // Split the output into lines
  const lines = stdout.split("\n");

  // Filter out the grep command itself from the results
  const processLines = lines.filter((line) => !line.includes("grep"));

  // Assuming the first result is the one we want if multiple are returned
  if (processLines.length > 0) {
    const processInfo = processLines[0];

    // Extracting PID from the process info, assuming standard ps aux output format
    alacrittyLfPID = processInfo.split(/\s+/)[1]; // PID is in the second column

    exec(
      `echo '{"command": "setPosition", "pid": ${alacrittyLfPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
      (err) => {
        if (err) {
          console.error(`Error moving Alacritty window: ${err}`);
        }
      }
    );
  } else {
    console.log("Alacritty LF process not found.");
  }
});

let codePID;
exec(
  // `ps aux | grep "/Applications/Visual Studio Code.app/Contents/MacOS/Electron"`, // For VSCode
  `ps aux | grep "/Applications/Cursor.app/Contents/MacOS/Cursor"`, // For Cursor
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    // Split the output into lines
    const lines = stdout.split("\n");

    // Filter out the grep command itself from the results
    const processLines = lines.filter((line) => !line.includes("grep"));

    // Assuming the first result is the one we want if multiple are returned
    if (processLines.length > 0) {
      const processInfo = processLines[0];

      // Extracting PID from the process info, assuming standard ps aux output format
      codePID = processInfo.split(/\s+/)[1]; // PID is in the second column

      console.log(`Code PIDiiiiii: ${codePID}`);
      // You can now use this PID for whatever you need
    } else {
      console.log("Kitty process not found.");
    }
  }
);

// Add the function to detect displays and set currentDisplay
function detectAndSetCurrentDisplay() {
  const displays = screen.getAllDisplays();
  currentDisplay = displays.length > 1 ? "external" : "internal";
  console.log(`Current display set to: ${currentDisplay}`);
}

// Detect displays
function onExternalDisplaysConnected() {
  currentDisplay = "external";
  exec(
    `echo '{"command": "setPosition", "pid": ${alacrittyMainPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
    (err) => {
      if (err) {
        console.error(`Error moving Alacritty window: ${err}`);
      }
    }
  );

  // exec(
  //   `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition",  "pid": ${kittyLazygitPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' localhost:57320`,
  //   (err) => {
  //     if (err) {
  //       console.error(`Error moving Alacritty window: ${err}`);
  //     }
  //   }
  // );

  exec(
    `echo '{"command": "setPosition", "pid": ${alacrittyLfPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
    (err) => {
      if (err) {
        console.error(`Error moving Alacritty window: ${err}`);
      }
    }
  );

  exec(
    `echo '{"command": "setPosition", "pid": ${codePID}, "x": ${defaultPositions[currentDisplay].editor.x}, "y": ${defaultPositions[currentDisplay].editor.y}, "width": ${defaultPositions[currentDisplay].editor.width}, "height": ${defaultPositions[currentDisplay].editor.height}}' | nc -U /tmp/winman.sock`,
    (err) => {
      if (err) {
        console.error(`Error moving VSCode window: ${err}`);
      }
    }
  );

  updateTopBarPositionAndSize();
}

// Monitor for display changes
function setupDisplayListeners() {
  powerMonitor.on("resume", () => {
    console.log("System is waking up from sleep");

    const displays = screen.getAllDisplays();
    if (displays.length > 1) {
      onExternalDisplaysConnected();
    }
  });

  screen.on("display-added", (event, newDisplay) => {
    console.log("Display added:", newDisplay.id);

    onExternalDisplaysConnected();
  });

  screen.on("display-removed", (event, oldDisplay) => {
    console.log("Display removed:", oldDisplay.id);
    currentDisplay = "internal";
    exec(
      `echo '{"command": "setPosition", "pid": ${alacrittyMainPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
      (err) => {
        if (err) {
          console.error(`Error moving Alacritty window: ${err}`);
        }
      }
    );

    // exec(
    //   `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition",  "pid": ${kittyLazygitPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' localhost:57320`,
    //   (err) => {
    //     if (err) {
    //       console.error(`Error moving Alacritty window: ${err}`);
    //     }
    //   }
    // );

    exec(
      `echo '{"command": "setPosition", "pid": ${alacrittyLfPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
      (err) => {
        if (err) {
          console.error(`Error moving Alacritty window: ${err}`);
        }
      }
    );

    exec(
      `echo '{"command": "setPosition", "pid": ${codePID}, "x": ${defaultPositions[currentDisplay].editor.x}, "y": ${defaultPositions[currentDisplay].editor.y}, "width": ${defaultPositions[currentDisplay].editor.width}, "height": ${defaultPositions[currentDisplay].editor.height}}' | nc -U /tmp/winman.sock`,
      (err) => {
        if (err) {
          console.error(`Error moving VSCode window: ${err}`);
        }
      }
    );

    updateTopBarPositionAndSize();
  });
}

// Function to update the top bar window's position and size
function updateTopBarPositionAndSize() {
  if (mainWindow) {
    const { height, width } = screen.getPrimaryDisplay().workAreaSize;

    const newWidth = width; // Assuming top bar spans the entire width

    const newBounds = {
      x: 0,
      y: 0, // Assuming top bar is always at the top
      width: newWidth,
      height: topBarHeight, // Assuming top bar height is constant
    };

    // Set the new bounds to the top bar window
    mainWindow.setBounds(newBounds);
  }
}

function changeActiveTab(direction) {
  console.log(
    "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    aaa    \x1b[8m\x1b[40m\x1b[0m%c main.js 345 \n",
    "color: white; background: black; font-weight: bold",
    ""
  );

  store.set("storedTabs", storedTabs);

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

  // Get the current user's home directory
  const homeDir = process.env.HOME;

  // Only replace the beginning of the path if it extends beyond the home directory
  let pathShort;
  if (storedTabs[activeTabIndex].path.startsWith(homeDir + "/")) {
    // The path extends beyond the home directory, so replace the beginning with "~"
    pathShort = storedTabs[activeTabIndex].path.replace(homeDir, "~");
  } else {
    // The path is either exactly the home directory or completely different, so leave it as is
    pathShort = storedTabs[activeTabIndex].path;
  }

  if (storedTabs[activeTabIndex].focusedApp === "alacritty-main") {
    exec(
      `open -a "Cursor" "${storedTabs[activeTabIndex].path}" && echo '{"command": "focus", "pid": ${codePID}, "title": "${pathShort}"}' | nc -U /tmp/winman.sock`,
      (err) => {
        if (err) {
          console.error(`Error focusing VSCode window: ${err}`);
        }

        // Open Kitty Main
        // Check for existing alacritty process for this workspace
        const workspacePath = storedTabs[activeTabIndex].path;
        console.log(
          `DEBUG: Directly focusing window for path: ${workspacePath}`
        );

        // Send winman socket request to focus existing window
        exec(
          `echo "focus alacritty ${workspacePath}" | nc -U /tmp/winman.sock`,
          { timeout: 50 }, // 50ms timeout for faster response
          (error, stdout, stderr) => {
            console.log(`winman response: ${stdout.trim()}`);
          }
        );
      }
    );
  } else {
    // Use winman to focus or create alacritty window for this workspace
    const workspacePath = storedTabs[activeTabIndex].path;
    console.log(
      `DEBUG: Using winman to focus alacritty for path: ${workspacePath}`
    );

    exec(
      `echo "focus alacritty ${workspacePath}" | nc -U /tmp/winman.sock`,
      { timeout: 50 }, // 50ms timeout for faster response
      (error, stdout, stderr) => {
        console.log(`winman response: ${stdout.trim()}`);
      }
    );

    console.log(
      "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    codePID    \x1b[8m\x1b[40m\x1b[0m%c main.js 552 \n",
      "color: white; background: black; font-weight: bold",
      "",
      codePID
    );

    exec(
      `open -a "Cursor" "${workspacePath}" && echo '{"command": "focus", "pid": ${codePID}, "title": "${pathShort}"}' | nc -U /tmp/winman.sock`,
      (err) => {
        if (err) {
          console.error(`Error focusing VSCode window: ${err}`);
        }
      }
    );
  }
}

function closeActiveTab() {
  if (storedTabs.length > 0) {
    // Only replace the beginning of the path if it extends beyond the home directory
    const homeDir = process.env.HOME;
    let pathShort;
    if (storedTabs[activeTabIndex].path.startsWith(homeDir + "/")) {
      // The path extends beyond the home directory, so replace the beginning with "~"
      pathShort = storedTabs[activeTabIndex].path.replace(homeDir, "~");
    } else {
      // The path is either exactly the home directory or completely different, so leave it as is
      pathShort = storedTabs[activeTabIndex].path;
    }

    // Close the VSCode window
    exec(
      `open -a "Cursor" && echo '{"command": "focus", "pid": ${codePID}, "title": "${pathShort}"}' | nc -U /tmp/winman.sock && osascript -e 'tell application "System Events" to keystroke "w" using {control down, command down, shift down}'`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error closing VSCode: ${error}`);
          // return;
        }
        // if (stderr) {
        //   console.error(`VSCode stderr: ${stderr}`);
        //   // return;
        // }
        if (!stdout && !stderr) {
          console.log(
            `VSCode closed with path: ${storedTabs[activeTabIndex].path}`
          );
        }

        // Replace 'your_platform_window_id' with the actual platform window ID you want to target
        const alacrittyPlatformWindowId =
          storedTabs[activeTabIndex].alacrittyPlatformWindowId;

        // List all windows within the specified platform window ID
        exec(`echo ''`, (err, stdout) => {
          if (err) {
            console.error(
              `Error listing windows for platform_window_id ${alacrittyPlatformWindowId}: ${err}`
            );
            return;
          }

          // Parse the output to get all window IDs within the specified platform window
          const windowIds = stdout
            .trim()
            .split("\n")
            .map((id) => id.trim());

          // Close each window within the specified platform window
          windowIds.forEach((kittyWindowId) => {
            exec(`echo ''`, (error, stdout, stderr) => {
              if (error) {
                console.error(
                  `Error closing Alacritty window ID ${kittyWindowId}: ${error}`
                );
                return;
              }
              if (stderr) {
                console.error(
                  `/Applications/kitty-main.app/Contents/MacOS/kitty stderr for window ID ${kittyWindowId}: ${stderr}`
                );
                return;
              }
              console.log(
                `/Applications/kitty-main.app/Contents/MacOS/alacritty window closed with ID: ${kittyWindowId}`
              );
            });
          });
        });

        // const kittyLazygitPlatformWindowId =
        //   storedTabs[activeTabIndex].kittyLazygitPlatformWindowId;

        // if (kittyLazygitPlatformWindowId) {
        //   // List all windows within the specified platform window ID
        //   exec(
        //     `/Applications/kitty-lazygit.app/Contents/MacOS/kitty @ --to unix:/tmp/kitty_lazygit ls | jq '.[] | select(.platform_window_id == ${kittyLazygitPlatformWindowId}) | .tabs[].windows[].id'`,
        //     (err, stdout) => {
        //       if (err) {
        //         console.error(
        //           `Error listing windows for platform_window_id ${kittyLazygitPlatformWindowId}: ${err}`
        //         );
        //         return;
        //       }

        //       // Parse the output to get all window IDs within the specified platform window
        //       const windowIds = stdout
        //         .trim()
        //         .split("\n")
        //         .map((id) => id.trim());

        //       // Close each window within the specified platform window
        //       windowIds.forEach((kittyWindowId) => {
        //         exec(
        //           `/Applications/kitty-lazygit.app/Contents/MacOS/kitty @ --to unix:/tmp/kitty_lazygit close-window --match id:${kittyWindowId}`,
        //           (error, stdout, stderr) => {
        //             if (error) {
        //               console.error(
        //                 `Error closing Alacritty window ID ${kittyWindowId}: ${error}`
        //               );
        //               return;
        //             }
        //             if (stderr) {
        //               console.error(
        //                 `/Applications/kitty-main.app/Contents/MacOS/kitty stderr for window ID ${kittyWindowId}: ${stderr}`
        //               );
        //               return;
        //             }
        //             console.log(
        //               `/Applications/kitty-main.app/Contents/MacOS/alacritty window closed with ID: ${kittyWindowId}`
        //             );
        //           }
        //         );
        //       });
        //     }
        //   );
        // }

        // Close the active tab
        storedTabs.splice(activeTabIndex, 1);

        // Adjust activeTabIndex if necessary
        if (activeTabIndex >= storedTabs.length) {
          activeTabIndex = Math.max(storedTabs.length - 1, 0);
        }

        const theme = store.get("theme", "light");

        // Save the updated state
        store.set("storedTabs", storedTabs);
        store.set("activeTabIndex", activeTabIndex);

        // Notify the renderer process to update the UI
        mainWindow.webContents.send(
          "update-tabs",
          storedTabs,
          activeTabIndex,
          theme
        );

        changeActiveTab();
      }
    );
  }
}



function createWindow() {
  detectAndSetCurrentDisplay();
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  // Check if there are no stored tabs
  if (storedTabs.length === 0) {
    // Create a new tab in the home directory
    storedTabs.push({
      focusedApp: "alacritty-main",
      alacrittyPlatformWindowId: "",
      path: "~/", // Set the path to home directory
    });
    store.set("storedTabs", storedTabs); // Save the new tab
  }

  mainWindow = new BrowserWindow({
    width,
    height: topBarHeight,
    x: 0,
    y: 0,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: false,
    roundedCorners: false,
    hasShadow: false,
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("did-finish-load", () => {
    // Send stored paths to the renderer process after mainWindow is loaded
    activeTabIndex = store.get("activeTabIndex", 0);
    mainWindow.webContents.send(
      "initialize-buttons",
      storedTabs,
      activeTabIndex
    );
  });

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
  // Calculate the screen dimensions and center position
  const centerX = Math.round(width / 2);
}

app.whenReady().then(() => {
  createWindow();
  setupDisplayListeners();
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

let storedTabs = store.get("storedTabs", []);
let activeTabIndex = store.get("activeTabIndex", 0);

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

    const focusedApp = storedTabs[activeTabIndex]?.focusedApp;

    switch (body) {
      case "left":
        changeActiveTab("ArrowLeft");
        break;
      case "right":
        changeActiveTab("ArrowRight");
        break;
      case "close":
        closeActiveTab();
        break;
      case "duplicate":
        activeTabIndex = store.get("activeTabIndex", 0);
        activeTabPath = storedTabs[activeTabIndex].path;
        mainWindow.webContents.send("add-new-button", activeTabPath);
        storedTabs.push({ path: activeTabPath });
        store.set("storedTabs", storedTabs);
        break;
      case "resetWindows":
        // Reposition all windows based on current display setting
        exec(
          `echo '{"command": "setPosition", "pid": ${alacrittyMainPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
          (err) => {
            if (err) {
              console.error(`Error moving Alacritty window: ${err}`);
            }
          }
        );

        exec(
          `echo '{"command": "setPosition", "pid": ${alacrittyLfPID}, "x": ${defaultPositions[currentDisplay].terminal.x}, "y": ${defaultPositions[currentDisplay].terminal.y}, "width": ${defaultPositions[currentDisplay].terminal.width}, "height": ${defaultPositions[currentDisplay].terminal.height}}' | nc -U /tmp/winman.sock`,
          (err) => {
            if (err) {
              console.error(`Error moving Alacritty window: ${err}`);
            }
          }
        );

        exec(
          `echo '{"command": "setPosition", "pid": ${codePID}, "x": ${defaultPositions[currentDisplay].editor.x}, "y": ${defaultPositions[currentDisplay].editor.y}, "width": ${defaultPositions[currentDisplay].editor.width}, "height": ${defaultPositions[currentDisplay].editor.height}}' | nc -U /tmp/winman.sock`,
          (err) => {
            if (err) {
              console.error(`Error moving VSCode window: ${err}`);
            }
          }
        );

        updateTopBarPositionAndSize();
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
          storedTabs[activeTabIndex].focusedApp = "alacritty-main";
          // storedTabs[activeTabIndex].kittyLazygitToggleTarget = "alacritty-main";
        }
        break;
      case "setVscodeFocused":
        if (storedTabs[activeTabIndex]) {
          storedTabs[activeTabIndex].focusedApp = "vscode";
          // storedTabs[activeTabIndex].kittyLazygitToggleTarget = "vscode";
        }
        break;
      case "activate":
        changeActiveTab();
        break;
      case "winPos":
        // TODO: Remove this
        console.log(
          "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    hej    \x1b[8m\x1b[40m\x1b[0m%c main.js 1488 \n",
          "color: white; background: black; font-weight: bold",
          ""
        );
        detectAndSetCurrentDisplay();
        break;
      case "setDefocused":
        break;
      case "testWinman":
        exec(
          `echo "focus alacritty ~/dev/osandell/winman" | nc -U /tmp/winman.sock`,
          { timeout: 50 },
          (error, stdout, stderr) => {
            if (error) {
              console.error(`winman test error: ${error}`);
            } else {
              console.log(`winman test response: ${stdout.trim()}`);
            }
          }
        );
        break;
      // Create new workspace
      default:
        const kittyDelay = 1000;
        const gitDir = path.join(body, ".git");
        let isGitRepo = fs.existsSync(gitDir);

        storedTabs.push({
          focusedApp: "alacritty-main",
          alacrittyPlatformWindowId: "",
          path: body,
        });

        store.set("storedTabs", storedTabs);

        // We need to do this here before storing window id:s to get the right activeTabIndex
        mainWindow.webContents.send("add-new-button", body);

        // Open new alacritty
        exec(
          `echo "focus alacritty ${body}" | nc -U /tmp/winman.sock`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error focusing alacritty: ${error}`);
            }
          }
        );

        exec(
          `open -a Cursor ${body}`,
          (vscodeError, vscodeStdout, vscodeStderr) => {
            if (vscodeError) {
              console.error(`Error opening VSCode: ${vscodeError}`);
              return;
            }

            // if (vscodeStderr) {
            //   console.error(`VSCode stderr: ${vscodeStderr}`);
            // }

            console.log(`VSCode opened with path: ${body}`);

            setTimeout(() => {
              exec(
                `echo '{"command": "setPosition", "frontmostOnly": true, "pid": ${codePID}, "x": ${defaultPositions[currentDisplay].editor.x}, "y": ${defaultPositions[currentDisplay].editor.y}, "width": ${defaultPositions[currentDisplay].editor.width}, "height": ${defaultPositions[currentDisplay].editor.height}}' | nc -U /tmp/winman.sock`,
                (err) => {
                  if (err) {
                    console.error(`Error moving VSCode window: ${err}`);
                  }
                }
              );
            }, kittyDelay + 10);
          }
        );

        break;
    }

    res.end("Request processed");
  });
});

server.listen(57321);
