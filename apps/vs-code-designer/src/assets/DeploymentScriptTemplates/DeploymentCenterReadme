# Logic App Custom Deployment Script

The Logic App custom deployment script, in combination with Azure Deployment Center, enables simple CD by starting a new Logic App deployment on each push to source control.

## Usage

- Enable Basic SCM Auth on the deployed Logic App resource
- Create a User-Assigned Managed Identity (UAMI) for the Logic App
- Grant the Logic App UAMI the "Logic App Standard Contributor" role on its containing resource group
- Configure Deployment Center on the Logic App to use your preferred source control with the "App Service Build Service" provider
- *(Service providers only)* If the Logic App contains service provider connections, update the values of the `*_connectionString` app settings in `cloud.settings.json` to reference key vault secrets containing the connections strings, e.g. `@Microsoft.KeyVault(SecretUri=https://<your-keyvault>.vault.azure.net/secrets/<secret>/)`
- Push the project workspace with the custom deployment script to the configured source repository