import { extractIntlMessages, extractIntlProperty, generateHexId } from './intl_id_helpers';

var testFile = `
	private validateLogicAppIdentity(baseUrl: string, identity: ManagedIdentity | undefined) {
    const intl = getIntl();
    if (isHybridLogicApp(baseUrl)) {
      if (!identity?.principalId || !identity?.tenantId) {
        throw new Error(
          intl.formatMessage({
            defaultMessage: 'App identity is not configured on the logic app environment variables.',
            id: 'zPRSM9',
            description: 'Error message when no app identity is added in environment variables',
          })
        );
      }
    } else if (!isIdentityAssociatedWithLogicApp(identity)) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'A managed identity is not configured on the logic app.',
          id: 'WnU9v0',
          description: 'Error message when no identity is associated',
        })
      );
    }
  }
`
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
	// Regex to find the `id` key and replace its value
	const regex = new RegExp(`(id:\\s*['"\`])${oldId}(['"\`])`);
	// Replace the old ID with the new ID
	const newId = localIdMapping[oldId];
	testFile = testFile.replace(regex, `$1${newId}`);
	console.log(`#> Replacing ID ${oldId} with ${newId}`);
	console.log(`#> New Content: ${testFile.replace(regex, `$1${newId}`)}`);
});
