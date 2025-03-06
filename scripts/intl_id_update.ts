import fs from 'fs';
import { glob } from 'glob';
import crypto from 'crypto';

// This is coming from our
function generateHexId(defaultMessage, description) {
  const content = `${defaultMessage}#${description}`;
  return crypto.createHash('sha512').update(content).digest('hex').slice(0, 12);
}

function updateFiles() {
  // Step 1: Update IDs in TS/TSX Files and Collect Mappings
  const idMapping = {}; // Store old -> new ID mapping
  const tsFiles = glob.sync('./**/*.{ts,tsx}');

  tsFiles.forEach((file) => {
    const localIdMapping = {}; // Store old -> new ID mapping for this file
    let content = fs.readFileSync(file, 'utf8');

    // Regex to capture the entire object inside intl.formatMessage()
    const regex = /intl\.formatMessage\(\s*\{([^}]+)\}\s*\)/gm;
    const intlMessages = [...content.matchAll(regex)];

    // Iterate over each intl.formatMessage() object
    intlMessages.forEach((match) => {
      const objectContent = match[1];

      // Extract old ID, defaultMessage, description
      const oldIdMatch = objectContent.match(/id:\s*["'`]([^"'`]+)["'`]/);
      const defaultMessageMatch = objectContent.match(/defaultMessage:\s*["'`]([^"'`]+)["'`]/);
      const descriptionMatch = objectContent.match(/description:\s*["'`]([^"'`]+)["'`]/);

      const oldId = oldIdMatch ? oldIdMatch[1] : null;
      const defaultMessage = defaultMessageMatch ? defaultMessageMatch[1] : null;
      const description = descriptionMatch ? descriptionMatch[1] : null;

      if (!oldId || !defaultMessage || !description) {
        console.error(`❌ Invalid intl.formatMessage() object found in ${file} : ${objectContent}`);
      } else {
        // Generate new ID based on defaultMessage and description
        const newId = generateHexId(defaultMessage, description);
        if (!localIdMapping[oldId] || localIdMapping[oldId] === newId) {
          localIdMapping[oldId] = newId;
        } else {
          // Error emoji to indicate that the ID is already present
          console.error(`❌ ID ${oldId} already exists in the mapping.`);
        }
      }
    });

    // Replace old IDs with new IDs
    Object.keys(localIdMapping).forEach((oldId) => {
      // Regex to find the `id` key and replace its value
      const regex = /(id:\s*['"`])([^'"`]+)(['"`])/g;
      // Replace the old ID with the new ID
      const newId = localIdMapping[oldId];
      content = content.replace(regex, `$1${newId}$3`);
    });

    fs.writeFileSync(file, content);

    // Check that no new IDs are already present in the global mapping
    Object.keys(localIdMapping).forEach((oldId) => {
      const newId = localIdMapping[oldId];
      if (idMapping[newId]) {
        console.error(`❌ ID ${newId} already exists in the global mapping.`);
      } else {
        idMapping[oldId] = newId;
      }
    });
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
