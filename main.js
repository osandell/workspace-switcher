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

let mainWindow; // Declare mainWindow at a higher scope

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
                `osascript -e 'tell application "System Events"' -e 'repeat with proc in every process whose name is "kitty"' -e 'repeat with kittyWindow in every window of proc' -e 'if name of kittyWindow is "${storedTabs[activeTabIndex].path}" then' -e 'set position of kittyWindow to {0, 55}' -e 'end if' -e 'end repeat' -e 'end repeat' -e 'end tell'`,
                (err) => {
                  if (err) {
                    console.error(`Error moving Kitty window: ${err}`);
                  }
                }
              );
            }, 1000); // Adjust the delay as needed
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

function removeActiveTab() {
  if (storedTabs.length > 0) {
    // Remove the active tab
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
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height: 24,
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
    console.log(
      "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c    activeTabIndex    \x1b[8m\x1b[40m\x1b[0m%c main.js 68 \n",
      "color: white; background: black; font-weight: bold",
      "",
      activeTabIndex
    );

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

  ipcMain.on("remove-active-tab", () => {
    removeActiveTab();
  });
}

app.whenReady().then(createWindow);

let storedTabs = [];
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

    const currentActiveApp = storedTabs[activeTabIndex].activeApp;

    switch (body) {
      case "left":
        changeActiveTab("ArrowLeft");
        break;
      case "right":
        changeActiveTab("ArrowRight");
        break;
      case "remove":
        removeActiveTab();
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
        storedTabs.push({ path: body });
        store.set("storedTabs", storedTabs);

        console.log(
          "\x1b[8m\x1b[40m\x1b[0m\x1b[7m%c            body    \x1b[8m\x1b[40m\x1b[0m%c main.js 142 \n",
          "color: white; background: black; font-weight: bold",
          "",
          `kitty @ --to unix:/tmp/mykitty launch --type=os-window --title=${body} --cwd=${body}`
        );
        exec(
          `kitty @ --to unix:/tmp/mykitty launch --type=os-window --title=${body} --cwd=${body}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error opening Kitty: ${error}`);
              return;
            }
            if (stderr) {
              console.error(`Kitty stderr: ${stderr}`);
              return;
            }
            console.log(`Kitty opened with path: ${body}`);

            // Move Kitty window after a short delay
            setTimeout(() => {
              exec(
                `osascript -e 'tell application "System Events"' -e 'repeat with proc in every process whose name is "kitty"' -e 'repeat with kittyWindow in every window of proc' -e 'if name of kittyWindow is "${body}" then' -e 'set position of kittyWindow to {0, 55}' -e 'end if' -e 'end repeat' -e 'end repeat' -e 'end tell'`,
                (err) => {
                  if (err) {
                    console.error(`Error moving Kitty window: ${err}`);
                  }
                }
              );
            }, 1000); // Adjust the delay as needed
          }
        );
        exec(`code ${body}`, (vscodeError, vscodeStdout, vscodeStderr) => {
          if (vscodeError) {
            console.error(`Error opening VSCode: ${vscodeError}`);
            return;
          }
          if (vscodeStderr) {
            console.error(`VSCode stderr: ${vscodeStderr}`);
            return;
          }
          console.log(`VSCode opened with path: ${body}`);

          // Move Kitty window after a short delay
          // setTimeout(() => {
          //   exec(
          //     `osascript -e 'tell application "System Events"' -e 'repeat with proc in every process whose name is "kitty"' -e 'repeat with kittyWindow in every window of proc' -e 'if name of kittyWindow is "${body}" then' -e 'set position of kittyWindow to {0, 55}' -e 'end if' -e 'end repeat' -e 'end repeat' -e 'end tell'`,
          //     (err) => {
          //       if (err) {
          //         console.error(`Error moving Kitty window: ${err}`);
          //       }
          //     }
          //   );
          // }, 1000); // Adjust the delay as needed
        });
        break;
    }

    res.end("Request processed");
  });
});

server.listen(57321);
