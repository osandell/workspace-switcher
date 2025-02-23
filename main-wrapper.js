// main-wrapper.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Prevent electron from crashing
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

// Import your actual main file
require('./main');
