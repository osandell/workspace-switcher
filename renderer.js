const { ipcRenderer, shell } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  createContainerStructure();
  
  document.addEventListener("keydown", (event) => {
    if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
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

function createContainerStructure() {
  const body = document.body;
  
  // Create container for buttons and background
  const container = document.createElement("div");
  container.id = "button-container";
  container.style.position = "relative";
  container.style.width = "100%";
  
  // Create the red background div
  const backgroundDiv = document.createElement("div");
  backgroundDiv.id = "button-background";
  backgroundDiv.style.position = "absolute";
  backgroundDiv.style.top = "0";
  backgroundDiv.style.left = "0";
  backgroundDiv.style.width = "100%";
  backgroundDiv.style.height = "100%";
  backgroundDiv.style.zIndex = "1";
  backgroundDiv.style.backgroundColor = "#d4cbb7";

  // Create the button wrapper div (will contain all buttons)
  const buttonWrapper = document.createElement("div");
  buttonWrapper.id = "button-wrapper";
  buttonWrapper.style.position = "relative";
  buttonWrapper.style.zIndex = "2";
  buttonWrapper.style.display = "flex";
  
  // Add elements to the DOM
  container.appendChild(backgroundDiv);
  container.appendChild(buttonWrapper);
  body.appendChild(container);
}

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
  const backgroundDiv = document.getElementById("button-background");

  if (theme === "dark") {
    body.style.backgroundColor = "#282828";
    body.style.borderColor = "#665c54"
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");
    backgroundDiv.style.backgroundColor = "#3c3836";

    buttons.forEach((button, index) => {
      button.style.backgroundColor =
        index === activeTabIndex ? "#458588" : "#3c3836";
      button.style.color = "#ebdbb2";
      button.style.fontWeight = "normal";
    });
  } else if (theme === "light") {
    body.style.backgroundColor = "#d4cbb7";
    body.style.borderColor = "#93a1a1"
    backgroundDiv.style.backgroundColor = "#d4cbb7";
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
    body.style.backgroundColor = "#282828";
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");

    buttons.forEach((button, index) => {
      button.style.backgroundColor =
        index === newActiveTabIndex ? "#647c73" : "#3c3836";
      button.style.color = "#ebdbb2";
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
    const buttonWrapper = document.getElementById("button-wrapper");
    buttonWrapper.innerHTML = "";

    // Add new buttons based on the theme
    updatedstoredTabs.forEach((tab, index) => {
      addDynamicButton(tab.path, index === newActiveTabIndex, theme);
    });
  }
);

function addDynamicButton(path, isActive = false, theme = "light") {
  // Get the button wrapper element
  const buttonWrapper = document.getElementById("button-wrapper");
  
  // If button wrapper doesn't exist, create container structure
  if (!buttonWrapper) {
    createContainerStructure();
  }
  
  // Extract the last part of the path (filename or last folder)
  const pathParts = path.split("/");
  const lastPart = pathParts[pathParts.length - 1];

  // Create a new button with only the last part of the path as text
  const button = document.createElement("button");
  button.textContent = lastPart;

  if (theme === "dark") {
    button.style.backgroundColor = isActive ? "#458588" : "#3c3836";
    button.style.color = "#ebdbb2";
  } else {
    button.style.backgroundColor = isActive ? "#fdf6e3" : "#d4cbb7";
    button.style.color = isActive ? "#2aa198" : "#93a1a1";
  }

  button.style.fontWeight = isActive ? "bold" : "normal";
  button.style.userSelect = "none";
  button.style.position = "relative";
  button.style.zIndex = "2";
  
  button.addEventListener("click", () => {
    shell.openPath(path);
  });

  // Append the button to the button wrapper
  document.getElementById("button-wrapper").appendChild(button);
}
