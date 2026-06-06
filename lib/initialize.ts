import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join(process.cwd(), 'json');
const TARGET_DIR = path.join(process.cwd(), 'public', 'json');

export function initializePublicJson(force = false) {
  try {
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    for (let i = 1; i <= 25; i++) {
      const fileName = `T${i}.json`;
      const sourcePath = path.join(SOURCE_DIR, fileName);
      const targetPath = path.join(TARGET_DIR, fileName);

      if (!fs.existsSync(sourcePath)) {
        continue;
      }

      // If target file doesn't exist, or if we force overwrite
      if (!fs.existsSync(targetPath) || force) {
        try {
          const content = fs.readFileSync(sourcePath, 'utf8');
          const data = JSON.parse(content);
          
          if (Array.isArray(data)) {
            // Slice the last 500 records to keep files lightweight (~100KB)
            const slicedData = data.slice(-500);
            fs.writeFileSync(targetPath, JSON.stringify(slicedData), 'utf8');
            console.log(`Initialized json/${fileName} with ${slicedData.length} records`);
          } else {
            // Fallback: copy file directly
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied json/${fileName} directly`);
          }
        } catch (err) {
          console.error(`Error processing ${fileName}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Failed to initialize public json directory:', err);
  }
}
