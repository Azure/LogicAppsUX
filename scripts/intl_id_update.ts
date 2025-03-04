import fs from 'fs';
import { glob } from 'glob';
import crypto from 'crypto';

function generateHexId(text) {
  return crypto.createHash('sha512').update(text.trim().replace(/\r\n/g, '\n'), 'utf8').digest('hex').slice(0, 8);
}

function updateFiles() {
  // Step 1: Update IDs in TS/TSX Files and Collect Mappings
  const idMapping = {}; // Store old -> new ID mapping
  const tsFiles = glob.sync('./**/*.{ts,tsx}');

  tsFiles.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Match and replace only inside  id: "3a8fb4b0"
    content = content.replace(/intl\.formatMessage\s*\(\s*\{([^}]+)\}\s*\)/g, (match, messageContent) => {
      const updatedMessage = messageContent.replace(/(id\s*:\s*)(["'`])([^"'`]+)\2/g, (idMatch, key, quote, oldId) => {
        if (!idMapping[oldId]) {
          idMapping[oldId] = generateHexId(oldId);
        }
        return `${key}${quote}${idMapping[oldId]}${quote}`;
      });

      return `intl.formatMessage({${updatedMessage}})`; // Ensure `{}` are preserved
    });
    fs.writeFileSync(file, content);
  });

  console.log('✅ Updated intl.formatMessage() IDs in TypeScript files.');

  // Step 2: Update IDs in JSON String Files
  const jsonFiles = glob.sync('./**/strings*.json');

  jsonFiles.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8');
    let jsonData = JSON.parse(content);
    let updated = false;

    Object.keys(idMapping).forEach((oldId) => {
      if (jsonData[oldId]) {
        jsonData[idMapping[oldId]] = jsonData[oldId]; // Copy to new ID
        delete jsonData[oldId]; // Remove old ID
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(file, JSON.stringify(jsonData, null, 2));
      console.log(`✅ Updated IDs in ${file}`);
    }
  });

  console.log('🎉 ID update completed across TypeScript and JSON files!');
}

updateFiles();
