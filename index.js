/**
 * This is the entry point for the backend application.
 * It points to the compiled main.js file in the dist directory.
 */

const path = require('path');
const fs = require('fs');

const mainPath = path.join(__dirname, 'dist', 'main.js');

if (fs.existsSync(mainPath)) {
  require(mainPath);
} else {
  console.error('Error: dist/main.js not found. Please run "npm run build" first.');
  process.exit(1);
}
