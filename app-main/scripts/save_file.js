import fs from 'fs';
import path from 'path';

// Inside your handler, after reading the raw body
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
const filePath = path.join(logsDir, `raw_body_${Date.now()}.txt`);
fs.writeFileSync(filePath, rawBodyBuffer);
console.log('Raw body saved to:', filePath);
