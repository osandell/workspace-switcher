// vscodeFocus.js
const http = require('http');

/**
 * Sends a focus command to VSCode window
 * @param {number} codePID - Process ID of VSCode window
 * @param {string} pathShort - Title/path to focus
 * @returns {Promise} Resolves with response data or rejects with error
 */
function focusVSCodeWindow(codePID, pathShort) {
  return new Promise((resolve, reject) => {
    // Make sure pathShort is properly quoted as a JSON string
    const data = `{"command": "focus", "pid": ${codePID}, "title": "${pathShort}"}`;
    
    console.log('Sending data:', data); // Debug log

    const options = {
      hostname: 'localhost',
      port: 57320,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      console.log('Focusing VSCode window');
      console.log('Status code:', res.statusCode);

      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      console.error('Error focusing VSCode window:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

module.exports = focusVSCodeWindow;
