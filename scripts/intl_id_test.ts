import { extractIntlMessages, extractIntlProperty, generateHexId } from './intl_id_helpers';

var testFile = `
	const testingTitle = intl.formatMessage({
		defaultMessage: 'Testing',
		id: '++ZVe/',
		description: 'Title for testing section',
	});
`;
const localIdMapping = {}; // Store old -> new ID mapping for this file

const intlMessages = extractIntlMessages(testFile);

// Iterate over each intl.formatMessage object
intlMessages.forEach((message) => {
  // Extract old ID, defaultMessage, description
  const oldId = extractIntlProperty(message, 'id');
  const defaultMessage = extractIntlProperty(message, 'defaultMessage');
  const description = extractIntlProperty(message, 'description');

  if (!oldId || !defaultMessage || !description) {
    console.error(`❌ Invalid intl.formatMessage object found: ${message}`);
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
  // eslint-disable-next-line no-useless-escape
  const escapedOldId = oldId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Regex to find the `id` key and replace its value
  const regex = new RegExp(`(id:\\s*['"\`])${escapedOldId}(['"\`])`);
  // Replace the old ID with the new ID
  const newId = localIdMapping[oldId];
  testFile = testFile.replace(regex, `$1${newId}$2`);
  console.log(`#> Replacing ID ${oldId} with ${newId}`);
  console.log(`#> New Content: ${testFile.replace(regex, `$1${newId}`)}`);
});
