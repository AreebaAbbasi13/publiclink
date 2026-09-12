const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ensure server directories
ensureDir(path.join(__dirname, 'server', 'db'));
ensureDir(path.join(__dirname, 'server', 'middleware'));
ensureDir(path.join(__dirname, 'server', 'routes'));
ensureDir(path.join(__dirname, 'server', 'services'));
ensureDir(path.join(__dirname, 'data'));

console.log('Server directories created.');
