import fs from 'fs';
import { glob } from 'glob';
import crypto from 'crypto';

export function generateHexId(defaultMessage, description) {
	const content = `${defaultMessage}#${description}`;
	const newId = crypto.createHash('sha512').update(content).digest('hex').slice(0, 12);
	console.log(`#> CONTENT: ${content}`);
	console.log(`    #> NEW_ID: ${newId}`);
	return newId;
}

export function extractIntlMessages(str: string) {
	const regex = /intl\.formatMessage\s*\(/g;
	let matches: string[] = [];
	let match;

	while ((match = regex.exec(str)) !== null) {
		let start = match.index + match[0].length - 1; // Get the index of the first '('
		let stack: number[] = [];
		let end = -1;

		for (let i = start; i < str.length; i++) {
			if (str[i] === '(') {
				stack.push(i);
			} else if (str[i] === ')') {
				stack.pop();
				if (stack.length === 0) {
					end = i;
					break;
				}
			}
		}

		if (end !== -1) {
			matches.push(str.slice(start + 1, end));
		}
	}

	return matches;
}

export function extractIntlProperty(str: string, property: string) {
	const firstQuoteRegex =  new RegExp(`${property}:\\s*['"\`]`, 'g');
	const firstQuoteMatch = str.match(firstQuoteRegex);
	const quote = firstQuoteMatch ? firstQuoteMatch[0].at(-1) : null;
	// Captures just the value within the outermost unescaped quotes pair into a group
	const valueRegex = new RegExp(`${property}\\s*:\\s*${quote}(?<=${quote})((?:[^${quote}\\\\]|\\\\.)*?)(?=${quote})${quote}`, 'g');
	// Return first capture group value
	return valueRegex.exec(str)?.[1];
}

export function updateFiles() {
	// Step 1: Update IDs in TS/TSX Files and Collect Mappings
	const idMapping = {}; // Store old -> new ID mapping
	const tsFiles = glob.sync('./**/*.{ts,tsx}');

	tsFiles.forEach((file) => {
		const localIdMapping = {}; // Store old -> new ID mapping for this file
		let content = fs.readFileSync(file, 'utf8');

		const intlMessages = extractIntlMessages(content);

		// Iterate over each intl.formatMessage object
		intlMessages.forEach((message) => {

			// Extract old ID, defaultMessage, description
			const oldId = extractIntlProperty(message, 'id');
			const defaultMessage = extractIntlProperty(message, 'defaultMessage');
			const description = extractIntlProperty(message, 'description');

			if (!oldId || !defaultMessage || !description) {
				console.error(`❌ Invalid intl.formatMessage object found in ${file} : ${message}`);
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
			// Regex to find the old `id` key and replace its value
			const regex = new RegExp(`(id:\\s*['"\`])${oldId}(['"\`])`);
			const newId = localIdMapping[oldId];
			content = content.replace(regex, `$1${newId}`);
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

	console.log('✅ Updated intl.formatMessage IDs in TypeScript files.');

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
