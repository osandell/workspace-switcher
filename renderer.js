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
      ipcRenderer.send("close-active-tab");
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

ipcRenderer.on("change-theme", (event, theme, activeTabIndex) => {
  const body = document.body;
  const buttons = document.querySelectorAll("button");

  if (theme === "dark") {
    // Gruvbox dark background color
    body.style.backgroundColor = "#282828"; // Gruvbox dark background
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");

    buttons.forEach((button, index) => {
      // Use Gruvbox color palette for buttons
      button.style.backgroundColor =
        index === activeTabIndex ? "#458588" : "#3c3836"; // Active button gets a distinct color
      button.style.color = "#ebdbb2"; // Text color for dark mode
      button.style.fontWeight = "normal";
    });
  } else if (theme === "light") {
    body.style.backgroundColor = "#d4cbb7";
    document.body.classList.remove("light-mode");

    buttons.forEach((button, index) => {
      button.style.backgroundColor =
        index === activeTabIndex ? "#fdf6e3" : "#d4cbb7";
      button.style.color = index === activeTabIndex ? "#2aa198" : "#93a1a1";
      button.style.fontWeight = index === activeTabIndex ? "bold" : "normal";
    });
  }
});

ipcRenderer.on("update-active-tab", (event, theme, newActiveTabIndex) => {
  const body = document.body;
  const buttons = document.querySelectorAll("button");
  if (theme === "dark") {
    // Gruvbox dark background color
    body.style.backgroundColor = "#282828"; // Gruvbox dark background
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");

    buttons.forEach((button, index) => {
      // Use Gruvbox color palette for buttons
      button.style.backgroundColor =
        index === newActiveTabIndex ? "#647c73" : "#3c3836"; // Active button gets a distinct color
      button.style.color = "#ebdbb2"; // Text color for dark mode
      button.style.fontWeight = "normal";
    });
  } else if (theme === "light") {
    body.style.backgroundColor = "#d4cbb7";
    document.body.classList.remove("light-mode");

    buttons.forEach((button, index) => {
      button.style.backgroundColor =
        index === newActiveTabIndex ? "#fdf6e3" : "#d4cbb7";
      button.style.color = index === newActiveTabIndex ? "#2aa198" : "#93a1a1";
      button.style.fontWeight = index === newActiveTabIndex ? "bold" : "normal";
    });
  }
});

ipcRenderer.on(
  "update-tabs",
  (event, updatedstoredTabs, newActiveTabIndex, theme) => {
    // Clear existing buttons
    const body = document.body;
    body.innerHTML = "";

    // Add new buttons based on the theme
    updatedstoredTabs.forEach((tab, index) => {
      addDynamicButton(tab.path, index === newActiveTabIndex, theme);
    });
  }
);

function addDynamicButton(path, isActive = false, theme = "light") {
  // Get the body element
  const body = document.body;

  // Extract the last part of the path (filename or last folder)
  const pathParts = path.split("/");
  const lastPart = pathParts[pathParts.length - 1];

  // Create a new button with only the last part of the path as text
  const button = document.createElement("button");
  button.textContent = lastPart;

  if (theme === "dark") {
    button.style.backgroundColor = isActive ? "#458588" : "#3c3836"; // Active and inactive colors for dark theme
    button.style.color = "#ebdbb2"; // Text color for dark theme
  } else {
    button.style.backgroundColor = isActive ? "#fdf6e3" : "#d4cbb7"; // Active and inactive colors for light theme
    button.style.color = isActive ? "#2aa198" : "#93a1a1"; // Text color for light theme
  }

  button.style.fontWeight = isActive ? "bold" : "normal";
  button.style.userSelect = "none";
  button.addEventListener("click", () => {
    shell.openPath(path);
  });

  // Append the button to the body
  body.appendChild(button);
}
