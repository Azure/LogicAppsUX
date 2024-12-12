# Logging

### Under the hood

#### Data Mapper Library

Logging functions that we use for the library can be found in libs/data-mapper-v2/src/utils/Logging.Utils.ts

Depending on whether or not we are in development or production mode, logs will go to Kusto or the console

We use [ApplicationInsights](https://www.npmjs.com/package/@microsoft/applicationinsights-web) to log to Kusto.

Talk about the prefix for queries

#### VSCode

We log VSCode commands with 'callWithTelemetryAndErrorHandling' from [VSCode Azure SDK for Node.js](https://www.npmjs.com/package/@microsoft/vscode-azext-utils).
This function logs our telemetry and shows errors in VSCode at the same time.

We log the name as the name of the command like this: 'vscode-azurelogicapps/azureLogicAppsStandard.dataMap.createNewDataMap'

#### General VSCode Telemetry Notes

We store the Application Insights IKey and Connection String (remove IKey) in our production-build.yml file. This value is copied over to the package.json of vs-code-designer where we read it and initialize App Insights using the library 
