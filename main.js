const {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  screen,
} = require("electron");
const http = require("http");
const Store = require("electron-store");
const store = new Store();
const { exec } = require("child_process");
const defaultPositions = {
  editor: { x: 600, y: 55, width: 1320, height: 1065 },
  terminal: { x: 0, y: 55, width: 600, height: 1065 },
};
const topBarHeight = 23;

let mainWindow; // Main top bar window
let lineWindow; // Vertical line window

let kittyPID;
exec(
  "ps aux | grep /Applications/kitty.app/Contents/MacOS/kitty",
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
      kittyPID = processInfo.split(/\s+/)[1]; // PID is in the second column

      // You can now use this PID for whatever you need
    } else {
      console.log("Kitty process not found.");
    }
  }
);

let codePID;
exec(
  `ps aux | grep "/Applications/Visual Studio Code.app/Contents/MacOS/Electron"`,
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

const fs = require("fs");
const path = "/tmp/current_workspace";

// Function to toggle the visibility of the line window
function toggleLineWindow(show) {
  if (lineWindow) {
    if (show) {
      // Show the line window if not already visible
      if (lineWindow.isVisible() === false) {
        lineWindow.show();
      }
    } else {
      // Hide the line window if visible
      if (lineWindow.isVisible() === true) {
        lineWindow.hide();
      }
    }
  }
}

// Function to check the file content and decide on the line window's visibility
function checkAndUpdateLineWindowVisibility() {
  fs.readFile(path, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
      return;
    }
    // Show or hide the line window based on file content
    toggleLineWindow(data.trim() === "Coding");
  });
}

// Set up file watch
fs.watch(path, (eventType, filename) => {
  if (eventType === "change") {
    checkAndUpdateLineWindowVisibility();
  }
});

// Initial check in case the application starts with the correct state already
checkAndUpdateLineWindowVisibility();

function changeActiveTab(direction) {
  if (direction === "ArrowRight") {
    activeTabIndex = (activeTabIndex + 1) % storedTabs.length;
  } else if (direction === "ArrowLeft") {
    activeTabIndex =
      (activeTabIndex - 1 + storedTabs.length) % storedTabs.length;
  }

  store.set("activeTabIndex", activeTabIndex);
  mainWindow.webContents.send("update-active-tab", activeTabIndex);

  const currentActiveApp = storedTabs[activeTabIndex].activeApp;
  if (currentActiveApp === "GitKraken") {
    const fullPath = storedTabs[activeTabIndex].path.replace(
      /^~/,
      "/Users/olof/"
    );
    exec(
      `ELECTRON_RUN_AS_NODE=1 /Applications/GitKraken.app/Contents/MacOS/GitKraken /Applications/GitKraken.app/Contents/Resources/app.asar/src/main/static/cli.js -p "${fullPath}" `,
      (gitKrakenError, gitKrakenStdout, gitKrakenStderr) => {
        if (gitKrakenError) {
          console.error(`Error opening GitKraken: ${gitKrakenError}`);
          return;
        }
        if (gitKrakenStderr) {
          console.error(`GitKraken stderr: ${vscodeStderr}`);
          return;
        }
        console.log(
          `GitKraken opened with path: ${storedTabs[activeTabIndex].path}`
        );

        // Move Kitty window after a short delay
        setTimeout(() => {
          exec(
            `kitty @ --to unix:/tmp/mykitty focus-window --match title:${storedTabs[activeTabIndex].path}`,
            (error, stdout, stderr) => {
              if (error) {
                console.error(`Error opening Kitty: ${error}`);
                return;
              }
              if (stderr) {
                console.error(`Kitty stderr: ${stderr}`);
                return;
              }
              console.log(
                `Kitty opened with path: ${storedTabs[activeTabIndex].path}`
              );
            }
          );
        }, 500); // Adjust the delay as needed
      }
    );
  } else {
    const pathShort = storedTabs[activeTabIndex].path.replace(
      /^\/Users\/[^\/]+/,
      "~"
    );

    const test = `${pathShort} ()`;
    console.log(
      "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    test    \x1b[8m\x1b[40m\x1b[0m%c main.js 112 \n",
      "color: white; background: black; font-weight: bold",
      "",
      `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition",  "pid": ${codePID}, "title": "${test}"}' localhost:57320`
    );

    exec(
      `curl -X POST -H "Content-Type: application/json" -d '{"command": "focus",  "pid": ${codePID}, "title": "${test}"}' localhost:57320`,
      (err) => {
        if (err) {
          console.error(`Error moving VSCode window: ${err}`);
        }
      }
    );
  }

  exec(
    `kitty @ --to unix:/tmp/mykitty focus-window --match title:${storedTabs[activeTabIndex].path}`,
    (error, stdout, stderr) => {
      if (error) {
        exec(
          `kitty @ --to unix:/tmp/mykitty launch --type=os-window --title=${storedTabs[activeTabIndex].path} --cwd=${storedTabs[activeTabIndex].path}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error opening Kitty: ${error}`);
              return;
            }
            if (stderr) {
              console.error(`Kitty stderr: ${stderr}`);
              return;
            }
            console.log(
              `Kitty opened with path: ${storedTabs[activeTabIndex].path}`
            );

            // Move Kitty window after a short delay
            setTimeout(() => {
              exec(
                `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition",  "pid": ${kittyPID}, "x": ${defaultPositions.terminal.x}, "y": ${defaultPositions.terminal.y}, "width": ${defaultPositions.terminal.width}, "height": ${defaultPositions.terminal.height}, "title": "${storedTabs[activeTabIndex].path}"}' localhost:57320`,
                (err) => {
                  if (err) {
                    console.error(`Error moving Kitty window: ${err}`);
                  }
                }
              );
            }, 100); // Adjust the delay as needed
          }
        );
        console.error(`Error opening Kitty: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`Kitty stderr: ${stderr}`);
        return;
      }
      console.log(`Kitty opened with path: ${storedTabs[activeTabIndex].path}`);
    }
  );

  // exec(
  //   `code ${storedTabs[activeTabIndex].path}`,
  //   (vscodeError, vscodeStdout, vscodeStderr) => {
  //     if (vscodeError) {
  //       console.error(`Error opening VSCode: ${vscodeError}`);
  //       return;
  //     }
  //     if (vscodeStderr) {
  //       console.error(`VSCode stderr: ${vscodeStderr}`);
  //       return;
  //     }
  //     console.log(
  //       `VSCode opened with path: ${storedTabs[activeTabIndex].path}`
  //     );
  //   }
  // );
}

function closeActiveTab() {
  if (storedTabs.length > 0) {
    // Close the active tab
    storedTabs.splice(activeTabIndex, 1);

    // Adjust activeTabIndex if necessary
    if (activeTabIndex >= storedTabs.length) {
      activeTabIndex = Math.max(storedTabs.length - 1, 0);
    }

    // Save the updated state
    store.set("storedTabs", storedTabs);
    store.set("activeTabIndex", activeTabIndex);

    // Notify the renderer process to update the UI
    mainWindow.webContents.send("update-tabs", storedTabs, activeTabIndex);
  }
}

function createWindow() {
  const { height, width } = screen.getPrimaryDisplay().workAreaSize;

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
    storedTabs = store.get("storedTabs") || [];
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

    store.set("activeTabIndex", activeTabIndex);
    mainWindow.webContents.send("update-active-tab", activeTabIndex);
  });

  ipcMain.on("close-active-tab", () => {
    closeActiveTab();
  });
  // Calculate the screen dimensions and center position
  const centerX = Math.round(width / 2);

  const notchHeight = 31;
  lineWindow = new BrowserWindow({
    width: 1, // 1px wide
    height: height - topBarHeight, // Full screen height
    x: defaultPositions.editor.x, // Adjusted to center
    y: topBarHeight + notchHeight + 1,
    transparent: true, // Ensure transparency for the line
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

  lineWindow.loadURL(
    "data:text/html;charset=utf-8,<style>body { margin: 0; padding: 0; background: rgb(212, 203, 183); }</style><body></body>"
  );

  lineWindow.setIgnoreMouseEvents(true);
}

app.whenReady().then(createWindow);

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

    const currentActiveApp = storedTabs[activeTabIndex]?.activeApp;

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
      case "toggleGitKraken":
        storedTabs = store.get("storedTabs") || [];
        activeTabIndex = store.get("activeTabIndex", 0);
        if (currentActiveApp === "GitKraken") {
          exec(
            `code ${storedTabs[activeTabIndex].path}`,
            (vscodeError, vscodeStdout, vscodeStderr) => {
              if (vscodeError) {
                console.error(`Error opening VSCode: ${vscodeError}`);
                return;
              }
              if (vscodeStderr) {
                console.error(`VSCode stderr: ${vscodeStderr}`);
                return;
              }
              console.log(
                `VSCode opened with path: ${storedTabs[activeTabIndex].path}`
              );
            }
          );
          storedTabs[activeTabIndex].activeApp = "VSCode";
        } else {
          const fullPath = storedTabs[activeTabIndex].path.replace(
            /^~/,
            "/Users/olof/"
          );
          exec(
            `ELECTRON_RUN_AS_NODE=1 /Applications/GitKraken.app/Contents/MacOS/GitKraken /Applications/GitKraken.app/Contents/Resources/app.asar/src/main/static/cli.js -p "${fullPath}" `,
            (gitKrakenError, gitKrakenStdout, gitKrakenStderr) => {
              if (gitKrakenError) {
                console.error(`Error opening GitKraken: ${gitKrakenError}`);
                return;
              }
              if (gitKrakenStderr) {
                console.error(`GitKraken stderr: ${vscodeStderr}`);
                return;
              }
              console.log(
                `GitKraken opened with path: ${storedTabs[activeTabIndex].path}`
              );

              // Move Kitty window after a short delay
              setTimeout(() => {
                exec(
                  `kitty @ --to unix:/tmp/mykitty focus-window --match title:${storedTabs[activeTabIndex].path}`,
                  (error, stdout, stderr) => {
                    if (error) {
                      console.error(`Error opening Kitty: ${error}`);
                      return;
                    }
                    if (stderr) {
                      console.error(`Kitty stderr: ${stderr}`);
                      return;
                    }
                    console.log(
                      `Kitty opened with path: ${storedTabs[activeTabIndex].path}`
                    );
                  }
                );
              }, 500); // Adjust the delay as needed
            }
          );
          storedTabs[activeTabIndex].activeApp = "GitKraken";
        }
        store.set("storedTabs", storedTabs);
        break;
      case "openCurrentApp":
        if (currentActiveApp === "GitKraken") {
          const fullPath = storedTabs[activeTabIndex].path.replace(
            /^~/,
            "/Users/olof/"
          );
          exec(
            `ELECTRON_RUN_AS_NODE=1 /Applications/GitKraken.app/Contents/MacOS/GitKraken /Applications/GitKraken.app/Contents/Resources/app.asar/src/main/static/cli.js -p "${fullPath}" `,
            (gitKrakenError, gitKrakenStdout, gitKrakenStderr) => {
              if (gitKrakenError) {
                console.error(`Error opening GitKraken: ${gitKrakenError}`);
                return;
              }
              if (gitKrakenStderr) {
                console.error(`GitKraken stderr: ${vscodeStderr}`);
                return;
              }
              console.log(
                `GitKraken opened with path: ${storedTabs[activeTabIndex].path}`
              );

              // Move Kitty window after a short delay
              setTimeout(() => {
                exec(
                  `kitty @ --to unix:/tmp/mykitty focus-window --match title:${storedTabs[activeTabIndex].path}`,
                  (error, stdout, stderr) => {
                    if (error) {
                      console.error(`Error opening Kitty: ${error}`);
                      return;
                    }
                    if (stderr) {
                      console.error(`Kitty stderr: ${stderr}`);
                      return;
                    }
                    console.log(
                      `Kitty opened with path: ${storedTabs[activeTabIndex].path}`
                    );
                  }
                );
              }, 500); // Adjust the delay as needed
            }
          );
        } else {
          exec(
            `code ${storedTabs[activeTabIndex].path}`,
            (vscodeError, vscodeStdout, vscodeStderr) => {
              if (vscodeError) {
                console.error(`Error opening VSCode: ${vscodeError}`);
                return;
              }
              if (vscodeStderr) {
                console.error(`VSCode stderr: ${vscodeStderr}`);
                return;
              }
              console.log(
                `VSCode opened with path: ${storedTabs[activeTabIndex].path}`
              );
            }
          );
        }
        break;
      default:
        // Handle path adding like before
        mainWindow.webContents.send("add-new-button", body);
        storedTabs.push({ fullscreenApps: [], path: body });
        store.set("storedTabs", storedTabs);

        exec(
          `kitty @ --to unix:/tmp/mykitty launch --type=os-window --title=${body} --cwd=${body}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error opening Kitty: ${error}`);
              // return;
            }
            if (stderr) {
              console.error(`Kitty stderr: ${stderr}`);
              // return;
            }
            console.log(`Kitty opened with path: ${body}`);
            console.log(`Kitty PIDst: ${kittyPID}`);
            // Move Kitty window after a short delay
            setTimeout(() => {
              console.log(`Kitty PIrrrrD: ${kittyPID}`);
              exec(
                `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition",  "pid": ${kittyPID}, "x": ${defaultPositions.terminal.x}, "y": ${defaultPositions.terminal.y}, "width": ${defaultPositions.terminal.width}, "height": ${defaultPositions.terminal.height}, "title": "${body}"}' localhost:57320`,
                (err) => {
                  if (err) {
                    console.error(`Error moving Kitty window: ${err}`);
                  }
                }
              );
            }, 100); // Adjust the delay as needed
          }
        );

        exec(`code ${body}`, (vscodeError, vscodeStdout, vscodeStderr) => {
          if (vscodeError) {
            console.error(`Error opening VSCode: ${vscodeError}`);
            return;
          }

          const pathShort = body.replace(/^\/Users\/[^\/]+/, "~");

          const test = `${pathShort} (Text Editor)`;

          if (vscodeStderr) {
            console.error(`VSCode stderr: ${vscodeStderr}`);
          }

          console.log(`VSCode opened with path: ${body}`);

          setTimeout(() => {
            console.log(
              "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c                codePID    \x1b[8m\x1b[40m\x1b[0m%c main.js 508 \n",
              "color: white; background: black; font-weight: bold",
              "",
              codePID
            );
            exec(
              `curl -X POST -H "Content-Type: application/json" -d '{"command": "setPosition",  "pid": ${codePID}, "x": ${defaultPositions.editor.x}, "y": ${defaultPositions.editor.y}, "width": ${defaultPositions.editor.width}, "height": ${defaultPositions.editor.height}, "title": "${test}"}' localhost:57320`,
              (err) => {
                if (err) {
                  console.error(`Error moving VSCode window: ${err}`);
                }
              }
            );
          }, 200); // Adjust the delay as needed
        });
        break;
    }

    res.end("Request processed");
  });
});

server.listen(57321);
