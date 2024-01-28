const { ipcRenderer, shell } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("keydown", (event) => {
    if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
      // Logic to change active tab
      ipcRenderer.send("change-active-tab", event.code);
    }

    if (event.code === "KeyR" || event.key === "r") {
      ipcRenderer.send("reload-window");
    }

    if (event.code === "KeyD" || event.key === "d") {
      ipcRenderer.send("remove-active-tab");
    }
  });
});

ipcRenderer.on("add-new-button", (event, path) => {
  addDynamicButton(path);
  ipcRenderer.send("new-tab", event.code);
});

ipcRenderer.on("initialize-buttons", (event, storedTabs, activeTabIndex) => {
  storedTabs.forEach((tab, index) => {
    addDynamicButton(tab.path, index === activeTabIndex);
  });
});

ipcRenderer.on("update-active-tab", (event, newActiveTabIndex) => {
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button, index) => {
    button.style.backgroundColor =
      index === newActiveTabIndex ? "#fdf6e3" : "#d4cbb7";
    button.style.color = index === newActiveTabIndex ? "#2aa198" : "#93a1a1";
    button.style.fontWeight = index === newActiveTabIndex ? "bold" : "normal";
  });
});

ipcRenderer.on("update-tabs", (event, updatedstoredTabs, newActiveTabIndex) => {
  // Clear existing buttons
  const body = document.body;
  body.innerHTML = "";

  // Add new buttons
  updatedstoredTabs.forEach((tab, index) => {
    addDynamicButton(tab.path, index === newActiveTabIndex);
  });
});

function addDynamicButton(path, isActive = false) {
  // Get the body element
  const body = document.body;

  // Extract the last part of the path (filename or last folder)
  const pathParts = path.split("/");
  const lastPart = pathParts[pathParts.length - 1];

  // Create a new button with only the last part of the path as text
  const button = document.createElement("button");
  button.textContent = lastPart;
  button.style.backgroundColor = isActive ? "#fdf6e3" : "#d4cbb7";
  button.style.color = isActive ? "#2aa198" : "#93a1a1";
  button.style.fontWeight = isActive ? "bold" : "normal";
  button.addEventListener("click", () => {
    shell.openPath(path);
  });

  // Append the button to the body
  body.appendChild(button);
}
