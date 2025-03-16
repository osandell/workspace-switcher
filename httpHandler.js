// vscodeFocus.js
const http = require("http");
const windowManager = require("./windowManager");

/**
 * Sends a focus command to VSCode window
 * @param {number} codePID - Process ID of VSCode window
 * @param {string} pathShort - Title/path to focus
 * @returns {Promise} Resolves with response data or rejects with error
 */
function focusVSCodeWindow(codePID, pathShort) {
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
    const command = `"c:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe" focus-cursor.ahk "${escapedPath}"`;

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

      if (stdout === "new") {
        console.log("New window, positioning in 7 seconds");
        console.log("esc path", escapedPath);
        setTimeout(() => {
          console.log(`Positioning Cursor window for path: ${escapedPath}`);
          windowManager.positionEditorWindow(escapedPath, false);
        }, 7000);
      } else {
        console.log("Existing window focused, not repositioning");
      }

      console.log("AutoHotkey script executed successfully");
      resolve({
        statusCode: 200,
        data: stdout,
      });
    });
  });
}

module.exports = focusVSCodeWindow;
